using System;

namespace Cs2DotsWeb
{
    using Microsoft.AspNetCore.Server;
    using Microsoft.AspNetCore.Hosting;
    using System.IO;
    public class Program
    {
        public static void Main(string[] args)
        {
            var host = new WebHostBuilder()
                .UseKestrel()
                .UseContentRoot(Directory.GetCurrentDirectory())
                .UseUrls("http://localhost:10000")
                .UseStartup<Startup>()
                .Build()
                ;
            host.Run();
            Console.WriteLine("Hello World!");
        }
    }
}
