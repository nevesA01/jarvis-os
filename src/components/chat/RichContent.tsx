import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Escapa HTML para prevenir XSS em conteúdo vindo do modelo */
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/** Highlight simples de linguagem para os blocos de código */
const highlightCode = (code: string, lang: string): string => {
  let out = escapeHtml(code);

  const wrap = (cls: string) => `<span class="${cls}">$1</span>`;

  if (["python", "py", "bash", "sh", "shell", "yaml", "yml", "env", "dockerfile", "json"].includes(lang)) {
    // Comentários
    out = out.replace(/(#[^\n]*)/g, wrap("text-slate-500 italic"));
    if (["bash", "sh", "shell"].includes(lang)) {
      // Comandos & flags
      out = out.replace(/(--[a-zA-Z-]+)/g, wrap("text-amber-300"));
    }
    if (["python", "py"].includes(lang)) {
      // Keywords
      out = out.replace(
        /\b(from|import|def|class|return|if|elif|else|for|while|try|except|finally|with|as|pass|async|await|yield|lambda|not|and|or|in|is|None|True|False|raise|assert|global|del)\b/g,
        wrap("text-sky-400 font-semibold")
      );
      // Strings
      out = out.replace(/(f?"[^"\n]*"|f?'[^'\n]*')/g, wrap("text-emerald-300"));
      // Decorators
      out = out.replace(/(@[a-zA-Z_][\w.]*)/g, wrap("text-purple-300"));
      // Números
      out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, wrap("text-orange-300"));
    }
    if (["yaml", "yml", "env"].includes(lang)) {
      out = out.replace(/^(\s*[\w.-]+)(:)/gm, `$1${wrap("text-sky-400 font-semibold")}`);
      out = out.replace(/(\b\d+(?:\.\d+)?\b)/g, wrap("text-orange-300"));
    }
  } else {
    // Default: keywords JS/TS/generic
    out = out.replace(
      /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|new|async|await|try|catch|finally|throw|typeof|interface|type|extends|implements)\b/g,
      wrap("text-sky-400 font-semibold")
    );
    out = out.replace(/("[^"\n]*"|'[^'\n]*')/g, wrap("text-emerald-300"));
  }

  return out;
};

interface RichContentProps {
  content: string;
}

/**
 * Renderiza conteúdo em markdown simplificado (títulos, listas, negrito,
 * código inline e blocos de código com highlight e botão copiar).
 */
export const RichContent: React.FC<RichContentProps> = ({ content }) => {
  const parts: React.ReactNode[] = [];
  const segments = content.split(/```/);

  segments.forEach((seg, idx) => {
    if (idx % 2 === 1) {
      // Code block: first line may contain the language
      const [firstLine, ...rest] = seg.split("\n");
      const lang = firstLine.trim().toLowerCase() || "text";
      const code = rest.join("\n");
      parts.push(
        <CodeBlock key={`code-${idx}`} code={code.replace(/\n$/, "")} lang={lang} />
      );
    } else {
      parts.push(<TextBlock key={`text-${idx}`} text={seg} />);
    }
  });

  return <div className="space-y-2.5">{parts}</div>;
};

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let listBuffer: string[] = [];
  let listOrdered = false;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    const ListTag = listOrdered ? "ol" : "ul";
    blocks.push(
      <ListTag key={key} className="list-none space-y-1.5 my-1">
        {listBuffer.map((li, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-1.5 shrink-0 rounded-full ${
                listOrdered
                  ? "text-[10px] font-mono font-bold text-sky-400"
                  : "w-1.5 h-1.5 bg-sky-400"
              }`}
            >
              {listOrdered ? `${i + 1}.` : ""}
            </span>
            <span className="flex-1">{renderInline(li)}</span>
          </li>
        ))}
      </ListTag>
    );
    listBuffer = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const unorderedMatch = line.match(/^\s*[-•*]\s+(.*)$/);
    const orderedMatch = line.match(/^\s*(\d+)[.)]\s+(.*)$/);

    if (unorderedMatch) {
      if (listOrdered) flushList(`l-${idx}`);
      listOrdered = false;
      listBuffer.push(unorderedMatch[1]);
      return;
    }
    if (orderedMatch) {
      if (!listOrdered) flushList(`l-${idx}`);
      listOrdered = true;
      listBuffer.push(orderedMatch[2]);
      return;
    }

    flushList(`l-${idx}`);

    if (!line.trim()) return;

    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={idx} className="text-sm font-bold text-white mt-2">
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={idx} className="text-sm font-bold text-sky-300 mt-2">
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h3 key={idx} className="text-base font-bold text-sky-300 mt-2">
          {renderInline(line.slice(2))}
        </h3>
      );
    } else {
      blocks.push(
        <p key={idx} className="leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  });

  flushList("l-final");

  return <div className="space-y-1.5">{blocks}</div>;
};

/** Negrito, itálico, código inline `x` */
const renderInline = (text: string): React.ReactNode => {
  const nodes: React.ReactNode[] = [];
  // Split by inline code first
  const codeParts = text.split(/(`[^`]+`)/g);
  codeParts.forEach((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      nodes.push(
        <code
          key={`c-${i}`}
          className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 text-[12px] font-mono border border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else {
      // Bold **x** and italic *x*
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      boldParts.forEach((bp, j) => {
        if (bp.startsWith("**") && bp.endsWith("**") && bp.length > 4) {
          nodes.push(
            <strong key={`b-${i}-${j}`} className="font-bold text-white">
              {bp.slice(2, -2)}
            </strong>
          );
        } else if (bp) {
          nodes.push(<React.Fragment key={`t-${i}-${j}`}>{bp}</React.Fragment>);
        }
      });
    }
  });
  return <>{nodes}</>;
};

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const langLabel: Record<string, string> = {
    python: "Python",
    py: "Python",
    bash: "Bash",
    sh: "Shell",
    shell: "Shell",
    yaml: "YAML",
    yml: "YAML",
    json: "JSON",
    dockerfile: "Dockerfile",
    env: "Env",
    typescript: "TypeScript",
    tsx: "TSX",
    text: "Texto",
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#050810] my-1">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-400">
          {langLabel[lang] || lang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" /> Copiado
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copiar
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed font-mono">
        <code
          className="text-slate-300"
          dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }}
        />
      </pre>
    </div>
  );
};
