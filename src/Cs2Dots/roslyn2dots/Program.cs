using System;
using Microsoft.CodeAnalysis.CSharp;
using System.IO;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using Microsoft.Extensions.CommandLineUtils;

namespace ConsoleApplication
{

    public class Program
    {
        static Dictionary<SyntaxKind, int> m_SyntaxCount = new Dictionary<SyntaxKind, int>();
        public static void Main(string[] args)
        {
            var app = new CommandLineApplication();
            var outputOption = app.Option("-o|--output <PATH>", "output file path(default: standard output)", CommandOptionType.SingleValue);
            var inputOption = app.Option("-i|--input <PATH>", "input cs file path(default: standard input)", CommandOptionType.SingleValue);
            var modeOption = app.Option("-m|--mode <MODE>", "parse mode(cs=regular C#(default),csx=scripting C#)", CommandOptionType.SingleValue);
            var nameOption = app.Option("-n|--name <GRAPHNAME>", "graph name(default=syntaxtree)", CommandOptionType.SingleValue);
            var includeTokenOption = app.Option("-t|--token", "include token", CommandOptionType.NoValue);
            app.HelpOption("-h|--help");
            app.VersionOption("-v|--version", "1.0.0");
            app.OnExecute(() =>
            {
                if (app.OptionHelp.HasValue())
                {
                    app.ShowHelp();
                    return 0;
                }
                if (app.OptionVersion.HasValue())
                {
                    app.ShowVersion();
                    return 0;
                }
                bool isSpecifyInput = false;
                bool isSpecifyOutput = false;
                TextReader inputStream = Console.In;
                TextWriter outputStream = Console.Out;
                var name = nameOption.HasValue() ? nameOption.Value() : "syntaxtree";
                var includeToken = includeTokenOption.HasValue();
                if (inputOption.HasValue())
                {
                    inputStream = File.OpenText(inputOption.Value());
                }
                if (outputOption.HasValue())
                {
                    outputStream = new StreamWriter(File.Create(outputOption.Value()), new UTF8Encoding(false));
                }
                try
                {
                    Cs2Dots.Cs2DotsConverter.Convert(inputStream.ReadToEnd(), outputStream, new Cs2Dots.ConvertOption(){
                        GraphName = name,
                        IsScript = modeOption.HasValue() && modeOption.Value().ToLower() == "csx",
                        IsIncludeToken = includeToken
                    });
                }
                finally
                {
                    if (isSpecifyInput)
                    {
                        inputStream.Dispose();
                    }
                    if (isSpecifyOutput)
                    {
                        outputStream.Dispose();
                    }
                }
                return 0;
            });
            try
            {
                var ret = app.Execute(args);
                Environment.Exit(ret);
            }
            catch (Exception e)
            {
                Console.Error.Write($"{e}");
                Environment.Exit(-1);
            }
        }
    }
}
