namespace Cs2DotsWeb
{
    using System.Text;
    using System;
    using Cs2Dots;
    using System.IO;
    using System.Threading.Tasks;
    using System.Diagnostics;
    public class Cs2DotsExecutor
    {
        Cs2DotsConfig m_config;
        public Cs2DotsExecutor(Cs2DotsConfig config)
        {
            m_config = config;
        }
        public async Task<string> ConvertJson(string code,string name,bool includeToken,bool scriptMode)
        {
            await Task.FromResult(0).ConfigureAwait(false);
            var opts = new Cs2Dots.ConvertOption();
            opts.GraphName = name;
            opts.IsIncludeToken = includeToken;
            opts.IsScript = scriptMode;
            using(var tw = new StringWriter())
            {
                Cs2Dots.Cs2JsonConverter.Convert(code,tw,opts);
                return tw.ToString();
            }
        }
        public async Task<string> ConvertSvg(string code,string name,bool includeToken,bool scriptMode)
        {
            await Task.FromResult(0).ConfigureAwait(false);
            var opts = new Cs2Dots.ConvertOption();
            opts.GraphName = name;
            opts.IsIncludeToken = includeToken;
            opts.IsScript = scriptMode;
            using(var tw = new StringWriter())
            {
                Cs2Dots.Cs2DotsConverter.Convert(code,tw,opts);
                var dot = tw.ToString();
                Console.WriteLine($"{dot}");
                var si = new ProcessStartInfo(m_config.GraphvizDotPath);
                si.CreateNoWindow = true;
                si.UseShellExecute = false;
                si.RedirectStandardError = true;
                si.RedirectStandardInput = true;
                si.RedirectStandardOutput = true;
                si.StandardOutputEncoding = Encoding.UTF8;
                si.Arguments = "-Tsvg";
                using(var proc = new Process())
                {
                    proc.StartInfo = si;
                    proc.Start();
                    using(var mstm = new MemoryStream(new UTF8Encoding(false).GetBytes(dot)))
                    {
                        await mstm.CopyToAsync(proc.StandardInput.BaseStream).ConfigureAwait(false);
                    }
                    proc.StandardInput.Dispose();
                    var res = await proc.StandardOutput.ReadToEndAsync().ConfigureAwait(false);
                    proc.WaitForExit();
                    if(proc.ExitCode != 0)
                    {
                        throw new Exception($"failed to execute dot({proc.ExitCode}):{proc.StandardError.ReadToEnd()}");
                    }
                    return res;
                }
            }
        }
    }
}