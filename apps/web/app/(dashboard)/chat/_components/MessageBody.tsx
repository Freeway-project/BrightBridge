"use client";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export function MessageBody({
  body,
  deletedAt,
}: {
  body: string;
  deletedAt: string | null;
}) {
  if (deletedAt) {
    return (
      <span className="italic text-muted-foreground text-sm">Message deleted</span>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{body}</ReactMarkdown>
    </div>
  );
}
