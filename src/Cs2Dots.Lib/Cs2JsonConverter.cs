using System;
using System.IO;

namespace Cs2Dots
{
    using Microsoft.CodeAnalysis.CSharp;
    using Microsoft.CodeAnalysis;
    using System.Collections.Generic;
    using Newtonsoft.Json;
    public static class Cs2JsonConverter
    {
        class Cs2JsonNode
        {
            public string Name { get; set; }
            public string Contents { get; set; }
            public bool IsToken { get; set; }
            public IList<Cs2JsonNode> Children { get; set; }
        }
        static readonly JsonSerializer m_Serializer = new JsonSerializer();
        public static void Convert(string code, TextWriter output, ConvertOption opts = null)
        {
            opts = opts ?? new ConvertOption();
            var csopt = new CSharpParseOptions()
                .WithKind(opts.IsScript ? SourceCodeKind.Script : SourceCodeKind.Regular);
            var rootNode = CSharpSyntaxTree.ParseText(code, csopt).GetRoot();
            output.Write(JsonConvert.SerializeObject(DoConvert2CsJsonNode(rootNode, opts, null)));
        }
        static Cs2JsonNode DoConvert2CsJsonNode(SyntaxNode node, ConvertOption opts, Dictionary<SyntaxKind, int> syntaxCount)
        {
            syntaxCount = syntaxCount ?? new Dictionary<SyntaxKind, int>();
            var csNode = new Cs2JsonNode()
            {
                Name = node.Kind().ToString(),
                Contents = node.ToFullString(),
                IsToken = false,
                Children = new List<Cs2JsonNode>(),
            };
            foreach (var child in node.ChildNodesAndTokens())
            {
                if (child.IsNode)
                {
                    csNode.Children.Add(DoConvert2CsJsonNode((SyntaxNode)child, opts, syntaxCount));
                }
                else if (child.IsToken && opts.IsIncludeToken)
                {
                    var token = (SyntaxToken)child;
                    csNode.Children.Add(new Cs2JsonNode()
                    {
                        Name = token.Kind().ToString(),
                        Contents = token.ValueText,
                        IsToken = true,
                        Children = new List<Cs2JsonNode>()
                    });
                }
            }
            return csNode;
        }
    }
}