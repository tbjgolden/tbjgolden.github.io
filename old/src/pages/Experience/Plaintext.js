import React, { useRef, useState, useEffect } from "react";
import withWindowWidth from "../../withWindowWidth";

const H1 = ({ children }) => (
  <>
    <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>
      {children}
    </span>
    {`\n${new Array(children.length).fill("=").join("")}`}
  </>
);

const H2 = ({ children }) => (
  <span
    style={{
      textTransform: "uppercase",
      fontFeatureSettings: '"c2sc"',
      fontWeight: "bold"
    }}
  >
    {children}
  </span>
);

const BR = () => "\n";

const HR = ({ chars }) => new Array(chars).fill("-").join("");

const LR = ({ l, r, chars }) => `${l.padEnd(chars - r.length - 1, " ")} ${r}`;

const P = ({ children, chars, indent }) =>
  generateLineBreaks(children, chars, indent);

const Plaintext = ({ xp }) => {
  const pre = useRef(null);
  const [chars, setChars] = useState(80);
  const [timeline] = useState(
    xp.timeline.reduce((t, { parts, ...rest }) => {
      if (parts) t.push(...parts.map(part => ({ ...rest, ...part })));
      else t.push(rest);
      return t;
    }, [])
  );

  useEffect(() => {
    if (pre.current) {
      const { fontSize } = window.getComputedStyle(pre.current);
      const maxChars = Math.max(
        66,
        Math.floor((pre.current.clientWidth * 2) / parseInt(fontSize, 10))
      );
      if (maxChars !== chars) setChars(maxChars);
    }
  }, [chars]);

  const Block = (
    { cause, parts, title, start, end, description, location, using },
    i
  ) => {
    const dateString = `${start} - ${end || "current"}`;
    if (i !== timeline.length - 1 && cause === timeline[i + 1].cause) {
      if (!~timeline[i + 1].description.indexOf(description)) {
        timeline[i + 1].description += ` ${description}`;
      }
      return (
        <React.Fragment key={i}>
          <BR />
          <LR l={`${title},`} r={dateString} chars={chars} />
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={i}>
        <BR />
        <LR
          l={[title, cause, location].filter(x => x).join(" · ")}
          r={dateString}
          chars={chars}
        />
        <BR />
        <HR chars={chars} />
        <BR />
        <P chars={Math.min(68, chars)} indent={2}>
          {description}
        </P>
        {using && (
          <>
            <BR />
            <P chars={chars} indent={2}>
              {using.map(s => `<${s}>`).join(" ")}
            </P>
          </>
        )}
        <BR />
      </React.Fragment>
    );
  };

  return (
    <pre ref={pre}>
      <code>
        <H1>{xp.name}</H1>
        <BR />
        {xp.website}
        {" | "}
        {window.obfs(xp.email)}
        {" | "}
        {window.obfs(xp.phone)}
        {xp.address && (
          <>
            {" | "}
            {xp.address}
          </>
        )}
        <BR />({xp.legalStatus})
        <BR />
        <BR />
        <H2>Experience</H2>
        <BR />
        {timeline.filter(({ type }) => type !== "education").map(Block)}
        <BR />
        <H2>Education</H2>
        <BR />
        {timeline.filter(({ type }) => type === "education").map(Block)}
      </code>
    </pre>
  );
};

function generateLineBreaks(paragraph, width, indent = 0) {
  width -= indent;

  const indentation = new Array(indent).fill(" ").join("");

  let newParagraph = indentation;
  let firstChar = 0;

  while (firstChar + width < paragraph.length) {
    for (let i = firstChar + width; i > firstChar; i--) {
      if (paragraph[i] === " ") {
        newParagraph += `${paragraph.substring(firstChar, i)}\n${indentation}`;
        firstChar = i + 1;
        break;
      }
    }
  }

  return newParagraph + paragraph.slice(Math.max(0, firstChar));
}

export default withWindowWidth(Plaintext);
