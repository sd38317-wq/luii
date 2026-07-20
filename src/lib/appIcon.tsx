export function MessageBubbleIcon({ size }: { size: number }) {
  const bubbleWidth = size * 0.6;
  const bubbleHeight = size * 0.42;
  const bubbleLeft = (size - bubbleWidth) / 2;
  const bubbleTop = size * 0.22;
  const dot = size * 0.09;
  const tailSize = size * 0.09;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        position: "relative",
        background: "linear-gradient(135deg, #fb923c, #f97316)",
        borderRadius: size * 0.22,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bubbleLeft,
          top: bubbleTop,
          width: bubbleWidth,
          height: bubbleHeight,
          background: "white",
          borderRadius: size * 0.1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: size * 0.045,
        }}
      >
        <div
          style={{
            width: dot,
            height: dot,
            borderRadius: dot,
            background: "#f97316",
            display: "flex",
          }}
        />
        <div
          style={{
            width: dot,
            height: dot,
            borderRadius: dot,
            background: "#f97316",
            display: "flex",
          }}
        />
        <div
          style={{
            width: dot,
            height: dot,
            borderRadius: dot,
            background: "#f97316",
            display: "flex",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: bubbleLeft + bubbleWidth * 0.18,
          top: bubbleTop + bubbleHeight - 2,
          width: 0,
          height: 0,
          borderLeft: `${tailSize}px solid transparent`,
          borderRight: `${tailSize}px solid transparent`,
          borderTop: `${tailSize * 1.2}px solid white`,
          display: "flex",
        }}
      />
    </div>
  );
}
