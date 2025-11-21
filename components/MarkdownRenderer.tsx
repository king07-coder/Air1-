import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-content text-sm md:text-base leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};