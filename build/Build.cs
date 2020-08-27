using System;
using System.Linq;
using Nuke.Common;
using Nuke.Common.Execution;
using Nuke.Common.IO;
using Nuke.Common.ProjectModel;
using Nuke.Common.Tooling;
using Nuke.Common.Utilities.Collections;
using static Nuke.Common.EnvironmentInfo;
using static Nuke.Common.IO.FileSystemTasks;
using static Nuke.Common.IO.PathConstruction;
using Nuke.Common.Tools.MSBuild;
using Nuke.Common.Tools.DotNet;

[CheckBuildProjectConfigurations]
[UnsetVisualStudioEnvironmentVariables]
class Build : NukeBuild
{
    /// Support plugins are available for:
    ///   - JetBrains ReSharper        https://nuke.build/resharper
    ///   - JetBrains Rider            https://nuke.build/rider
    ///   - Microsoft VisualStudio     https://nuke.build/visualstudio
    ///   - Microsoft VSCode           https://nuke.build/vscode

    public static int Main () => Execute<Build>(x => x.Compile);

    [Parameter("Configuration to build - Default is 'Debug' (local) or 'Release' (server)")]
    readonly Configuration Configuration = IsLocalBuild ? Configuration.Debug : Configuration.Release;

    [Solution] readonly Solution Solution;

    Target Clean => _ => _
        .Before(Restore)
        .Executes(() =>
        {
        });

    Target Restore => _ => _
        .Executes(() =>
        {
            DotNetTasks.DotNetRestore(settings => settings.SetProjectFile(Solution)
                );
        });

    Target Compile => _ => _
        .DependsOn(BuildCsModules)
        .DependsOn(PublishCsModules)
        .DependsOn(BuildExtension)
        .Executes(() =>
        {
        });
    
    Target BuildCsModules => _ => _
        .DependsOn(Restore)
        .Executes(() =>
        {
            DotNetTasks.DotNetBuild(settings => settings.SetConfiguration(Configuration)
                .SetProjectFile(Solution));
        });
    Target PublishCsModules => _ => _
        .DependsOn(BuildCsModules)
        .Executes(() =>
        {
            var distdir = RootDirectory / "dist" / Configuration;
            DotNetTasks.DotNetPublish(settings => settings.SetProject(RootDirectory / "src" / "Cs2Dots" / "Cs2Dots.csproj")
                .SetProperty("PublishDir", distdir / "Cs2Dots")
                .SetConfiguration(Configuration));
            DotNetTasks.DotNetPublish(settings => settings.SetProject(RootDirectory / "src" / "Cs2DotsWeb" / "Cs2DotsWeb.csproj")
                .SetConfiguration(Configuration)
                .SetProperty("PublishDir", distdir / "Cs2DotsWeb"));
        });
    Target BuildExtension => _ => _
        .After(PublishCsModules)
        .Executes(() =>
        {
            var srcdir = RootDirectory / "src" / "cs-syntax-visualizer";
            using(var proc = ProcessTasks.StartProcess("npm", "install", srcdir))
            {
                proc.WaitForExit();
                if(proc.ExitCode != 0)
                {
                    throw new Exception($"failed to execute npm install({proc.ExitCode})");
                }
            }
            using(var proc = ProcessTasks.StartProcess("vsce", "package", srcdir))
            {
                proc.WaitForExit();
                if(proc.ExitCode != 0)
                {
                    throw new Exception($"failed to execute vsce package({proc.ExitCode})");
                }
            }
            
        });
}
