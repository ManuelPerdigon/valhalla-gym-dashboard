export default function ConfirmModal({
  open,
  title = "Confirmar",
  message = "¿Seguro?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  busy,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9998,
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 480,
          maxWidth: "100%",
          background: "#0b0b0b",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
        <div style={{ opacity: 0.85, marginTop: 8 }}>{message}</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              background: "#1a1a1a",
              border: "1px solid #444",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              opacity: busy ? 0.6 : 1,
              fontWeight: 800,
            }}
          >
            {busy ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}