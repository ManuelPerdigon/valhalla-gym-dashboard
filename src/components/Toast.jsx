import { useEffect } from "react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose?.(), toast.duration || 2400);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 9999,
        width: 360,
        maxWidth: "calc(100vw - 36px)",
        padding: 14,
        borderRadius: 14,
        border: "1px solid #2a2a2a",
        background: "#0b0b0b",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ fontSize: 18, marginTop: 2 }}>
          {toast.type === "success" ? "✅" : toast.type === "warn" ? "⚠️" : "❌"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800 }}>{toast.title || "Mensaje"}</div>
          {toast.message && (
            <div style={{ opacity: 0.85, marginTop: 4, fontSize: 13 }}>
              {toast.message}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid #333",
            color: "#fff",
            borderRadius: 10,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}