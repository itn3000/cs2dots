namespace Cs2DotsWeb
{
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.AspNetCore.Builder;
    using Microsoft.Extensions.FileProviders;
    using Microsoft.AspNetCore.Hosting;
    using System.IO;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Configuration;
    using System;

    class Startup
    {
        string m_GraphVizPath = "dot";
        public Startup(IHostingEnvironment env)
        {
            var config = new ConfigurationBuilder()
                // .AddCommandLine(Environment.GetCommandLineArgs())
                .AddEnvironmentVariables()
                .Build()
                ;
            m_GraphVizPath = "";
            var graphVizPathConfig = config.GetSection("GraphVizPath");
            if(graphVizPathConfig != null)
            {
                m_GraphVizPath = graphVizPathConfig.Value;
            }
            if(string.IsNullOrEmpty(m_GraphVizPath))
            {
                m_GraphVizPath = Environment.GetEnvironmentVariable("GRAPHVIZ_DOT");
            }
        }
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddMvc();
            services.AddLogging();
            services.AddTransient(typeof(Cs2DotsConfig),prov => {
                return new Cs2DotsConfig()
                {
                    GraphvizDotPath = m_GraphVizPath
                };
            });
        }
        public void Configure(IApplicationBuilder builder,IHostingEnvironment env,ILoggerFactory loggerFactory)
        {
            loggerFactory.AddConsole();
            loggerFactory.AddDebug();
            var stopts = new StaticFileOptions();
            stopts.FileProvider = new PhysicalFileProvider(Path.Combine(env.ContentRootPath,"node_modules"));
            stopts.RequestPath = "/jslib";
            builder.UseStaticFiles(stopts);
            stopts = new StaticFileOptions();
            stopts.FileProvider = new PhysicalFileProvider(Path.Combine(env.ContentRootPath,"wwwroot","js"));
            stopts.RequestPath = "/js";
            builder.UseStaticFiles(stopts);
            builder.UseMvc(routes => {
                routes.MapRoute("default",
                    "{controller=Home}/{action=Index}");
            });
        }
    }
}