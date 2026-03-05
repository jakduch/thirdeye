import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '@mui/material/styles';

interface Props {
  children: string;
}

export default function GitHubMarkdown({ children }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // GitHub Primer colors
  const fg = isDark ? '#e6edf3' : '#1f2328';
  const fgMuted = isDark ? '#8b949e' : '#656d76';
  const border = isDark ? '#30363d' : '#d0d7de';
  const canvasSubtle = isDark ? '#161b22' : '#f6f8fa';
  const canvasDefault = isDark ? '#0d1117' : '#ffffff';
  const accentFg = isDark ? '#58a6ff' : '#0969da';
  const codeBg = isDark ? 'rgba(110,118,129,0.4)' : 'rgba(175,184,193,0.2)';
  const borderSubtle = isDark ? '#21262d' : '#d1d9e0';

  return (
    <div
      className="gh-md"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        fontSize: '14px',
        lineHeight: 1.5,
        wordWrap: 'break-word',
        color: fg,
      }}
    >
      <style>{`
        .gh-md > *:first-child { margin-top: 0 !important; }
        .gh-md > *:last-child { margin-bottom: 0 !important; }

        .gh-md p { margin: 0 0 16px 0; }

        .gh-md h1, .gh-md h2 {
          margin: 24px 0 16px 0;
          padding-bottom: 0.3em;
          border-bottom: 1px solid ${border};
          font-weight: 600;
          line-height: 1.25;
        }
        .gh-md h1 { font-size: 2em; }
        .gh-md h2 { font-size: 1.5em; }
        .gh-md h3 { font-size: 1.25em; margin: 24px 0 16px 0; font-weight: 600; line-height: 1.25; }
        .gh-md h4 { font-size: 1em; margin: 24px 0 16px 0; font-weight: 600; line-height: 1.25; }
        .gh-md h5, .gh-md h6 { font-size: 0.875em; margin: 24px 0 16px 0; font-weight: 600; line-height: 1.25; }

        .gh-md a {
          color: ${accentFg};
          text-decoration: none;
        }
        .gh-md a:hover { text-decoration: underline; }

        .gh-md code {
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 85%;
          white-space: break-spaces;
          background-color: ${codeBg};
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
        }

        .gh-md pre {
          padding: 16px;
          overflow: auto;
          font-size: 85%;
          line-height: 1.45;
          background-color: ${canvasSubtle};
          border-radius: 6px;
          border: 1px solid ${border};
          margin: 0 0 16px 0;
        }
        .gh-md pre code {
          padding: 0;
          margin: 0;
          font-size: 100%;
          background-color: transparent;
          border-radius: 0;
          white-space: pre;
          word-break: normal;
        }

        .gh-md blockquote {
          padding: 0 1em;
          color: ${fgMuted};
          border-left: 0.25em solid ${border};
          margin: 0 0 16px 0;
        }
        .gh-md blockquote > :first-child { margin-top: 0; }
        .gh-md blockquote > :last-child { margin-bottom: 0; }

        .gh-md ul, .gh-md ol {
          padding-left: 2em;
          margin: 0 0 16px 0;
        }
        .gh-md li { margin-top: 0.25em; }
        .gh-md li + li { margin-top: 0.25em; }
        .gh-md li > p { margin-top: 16px; }
        .gh-md li > p:first-child { margin-top: 0; }

        .gh-md table {
          border-spacing: 0;
          border-collapse: collapse;
          display: block;
          width: max-content;
          max-width: 100%;
          overflow: auto;
          margin: 0 0 16px 0;
        }
        .gh-md table th, .gh-md table td {
          padding: 6px 13px;
          border: 1px solid ${border};
        }
        .gh-md table th {
          font-weight: 600;
          background-color: ${canvasSubtle};
        }
        .gh-md table tr {
          background-color: ${canvasDefault};
          border-top: 1px solid ${borderSubtle};
        }
        .gh-md table tr:nth-of-type(2n) {
          background-color: ${canvasSubtle};
        }

        .gh-md hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: ${border};
          border: 0;
          border-radius: 2px;
        }

        .gh-md img {
          max-width: 100%;
          border-radius: 6px;
          border: 1px solid ${border};
        }

        .gh-md input[type="checkbox"] {
          margin: 0 0.5em 0.25em 0;
          vertical-align: middle;
        }

        .gh-md details {
          margin-bottom: 16px;
        }
        .gh-md details summary {
          cursor: pointer;
          font-weight: 600;
        }
        .gh-md details summary:hover {
          color: ${accentFg};
        }

        .gh-md .task-list-item {
          list-style: none;
        }
        .gh-md .task-list-item input {
          margin: 0 0.35em 0.25em -1.6em;
          vertical-align: middle;
        }

        .gh-md kbd {
          display: inline-block;
          padding: 3px 5px;
          font: 11px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          line-height: 10px;
          color: ${fg};
          vertical-align: middle;
          background-color: ${canvasSubtle};
          border: solid 1px ${border};
          border-bottom-color: ${border};
          border-radius: 6px;
          box-shadow: inset 0 -1px 0 ${border};
        }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
