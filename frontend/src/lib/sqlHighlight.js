// Simple SQL syntax highlighter -> JSX
import React from "react";

const KEYWORDS = [
  "SELECT","FROM","WHERE","JOIN","LEFT","RIGHT","INNER","OUTER","FULL","ON","AS",
  "GROUP","BY","ORDER","HAVING","LIMIT","OFFSET","DISTINCT","UNION","ALL","AND","OR","NOT",
  "IN","BETWEEN","LIKE","IS","NULL","CASE","WHEN","THEN","ELSE","END","WITH","ASC","DESC",
  "COUNT","SUM","AVG","MIN","MAX","CAST","COALESCE","DATE","STRFTIME","EXTRACT"
];

export function highlightSQL(sql) {
  if (!sql) return null;
  const tokens = [];
  const regex = /(\s+)|(--.*?$)|('[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)|([(),.;*=<>!+\-/])/gm;
  let m;
  while ((m = regex.exec(sql)) !== null) {
    if (m[1]) tokens.push({ t: "ws", v: m[1] });
    else if (m[2]) tokens.push({ t: "comment", v: m[2] });
    else if (m[3]) tokens.push({ t: "string", v: m[3] });
    else if (m[4]) tokens.push({ t: "number", v: m[4] });
    else if (m[5]) {
      const u = m[5].toUpperCase();
      tokens.push({ t: KEYWORDS.includes(u) ? "keyword" : "ident", v: m[5] });
    } else if (m[6]) tokens.push({ t: "punct", v: m[6] });
  }
  return tokens.map((tok, i) => {
    if (tok.t === "keyword") return <span key={i} className="sql-keyword">{tok.v}</span>;
    if (tok.t === "string") return <span key={i} className="sql-string">{tok.v}</span>;
    if (tok.t === "number") return <span key={i} className="sql-number">{tok.v}</span>;
    if (tok.t === "comment") return <span key={i} className="sql-comment">{tok.v}</span>;
    return <span key={i}>{tok.v}</span>;
  });
}
