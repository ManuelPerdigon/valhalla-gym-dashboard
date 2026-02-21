import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div style={styles.wrapper}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            ...styles.toast,
            background:
              t.type === "error"
                ? "#2b0000"
                : t.type === "warning"
                ? "#332600"
                : "#002b16",
            borderColor:
              t.type === "error"
                ? "#ff5555"
                : t.type === "warning"
                ? "#ffcc00"
                : "#00ff99"
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = {
  wrapper: {
    position: "fixed",
    bottom: 20,
    right: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 9999,
  },
  toast: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid",
    color: "#fff",
    background: "#002b16",
    fontSize: 14,
    minWidth: 200,
    boxShadow: "0 0 10px rgba(0,0,0,0.4)",
    animation: "fadeIn 0.25s ease"
  }
};