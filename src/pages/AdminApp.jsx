// src/pages/AdminApp.jsx
import { useEffect, useMemo, useState } from "react";
import ClientForm from "../components/ClientForm";
import ClientCard from "../components/ClientCard";
import Dashboard from "../components/Dashboard";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";

const EMPTY_MEMBERSHIP = {
  type: "",
  start: "",
  end: "",
  amount: "",
  paymentStatus: "pending",
};

export default function AdminApp() {
  const { user, logout, API_URL, token, isAuthed } = useAuth();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [initialWeight, setInitialWeight] = useState("");
  const [initialDate, setInitialDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const [users, setUsers] = useState([]);
  const [uName, setUName] = useState("");
  const [uUsername, setUUsername] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uClientId, setUClientId] = useState("");
  const [uErr, setUErr] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (t) => setToast(t);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  function tryParseMaybeJSON(x) {
    if (x == null) return x;

    if (typeof x === "object") return x;

    if (typeof x === "string") {
      const s = x.trim();
      if (!s) return x;

      try {
        const once = JSON.parse(s);

        if (typeof once === "string") {
          const t = once.trim();
          if (
            (t.startsWith("[") && t.endsWith("]")) ||
            (t.startsWith("{") && t.endsWith("}"))
          ) {
            try {
              return JSON.parse(t);
            } catch {
              return once;
            }
          }
        }

        return once;
      } catch {
        return x;
      }
    }

    return x;
  }

  function parseJSONSafe(v, fallback) {
    try {
      if (v == null) return fallback;
      if (typeof v === "string") return JSON.parse(v);
      return v;
    } catch {
      return fallback;
    }
  }

  function normalizeClient(raw) {
    if (!raw || typeof raw !== "object") return raw;
    return {
      ...raw,
      nutrition: parseJSONSafe(raw.nutrition, { adherence: [] }),
      progress: parseJSONSafe(raw.progress, []),
      membership: parseJSONSafe(raw.membership, EMPTY_MEMBERSHIP),
    };
  }

  async function apiFetch(path, options = {}) {
    const t = localStorage.getItem("vh_token") || "";

    const headers = {
      ...(options.headers || {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };

    const isFormData = options.body instanceof FormData;
    if (!isFormData) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    const rawText = await res.text().catch(() => "");
    const parsed = tryParseMaybeJSON(rawText);

    return { ok: res.ok, status: res.status, data: parsed, rawText };
  }

  const refreshUsers = async () => {
    const res = await apiFetch("/users", { method: "GET" });

    const list = Array.isArray(res.data) ? res.data : [];
    setUsers(list);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo cargar usuarios",
        message:
          (res.data && res.data.error) ||
          `Error ${res.status}. BODY: ${String(res.rawText).slice(0, 120)}`,
      });
    }

    return list;
  };

  const refreshClients = async () => {
    const res = await apiFetch("/clients", { method: "GET" });

    const list = Array.isArray(res.data) ? res.data.map(normalizeClient) : [];
    setClients(list);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo cargar clientes",
        message:
          (res.data && res.data.error) ||
          `Error ${res.status}. BODY: ${String(res.rawText).slice(0, 120)}`,
      });
    }

    return list;
  };

  async function loadAll() {
    setLoading(true);
    await Promise.all([refreshUsers(), refreshClients()]);
    setLoading(false);
  }

  useEffect(() => {
    if (!isAuthed) return;
    if (user?.role !== "admin") return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, token, user?.role]);

  const addClient = async () => {
    const n = name.trim();
    if (!n) {
      showToast({
        type: "warn",
        title: "Falta nombre",
        message: "Escribe el nombre del cliente.",
      });
      return;
    }

    setBusy(true);
    const res = await apiFetch("/clients", {
      method: "POST",
      body: JSON.stringify({
        name: n,
        initialWeight,
        initialDate,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo crear cliente",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => [normalizeClient(res.data), ...prev]);
    setName("");
    setInitialWeight("");
    setInitialDate(new Date().toISOString().slice(0, 10));

    showToast({
      type: "success",
      title: "Cliente creado",
      message: n,
    });
  };

  const requestDeleteClient = (client) => {
    setToDelete(client);
    setConfirmOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!toDelete) return;

    setBusy(true);
    const res = await apiFetch(`/clients/${toDelete.id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo eliminar",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.filter((c) => c.id !== toDelete.id));
    showToast({
      type: "success",
      title: "Cliente eliminado",
      message: toDelete.name,
    });
    setConfirmOpen(false);
    setToDelete(null);
  };

  const toggleStatus = async (id) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;

    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: c.active ? 0 : 1 }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo actualizar estado",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? normalizeClient(res.data) : x)));
  };

  const saveRoutine = async (id, routine) => {
    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ routine }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo guardar rutina",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? normalizeClient(res.data) : x)));
  };

  const addProgress = async (id, newProgressArray) => {
    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ progress: newProgressArray }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo guardar progreso",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? normalizeClient(res.data) : x)));
  };

  const saveGoalWeight = async (id, goalWeight) => {
    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ goalWeight }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo guardar meta",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? normalizeClient(res.data) : x)));
  };

  const saveNutrition = async (id, nutritionData) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;

    const normalized = normalizeClient(current);
    const currentNutrition = normalized.nutrition || { adherence: [] };

    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        nutrition: {
          ...currentNutrition,
          ...nutritionData,
        },
      }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo guardar nutrición",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? normalizeClient(res.data) : x)));
  };

  const addNutritionLog = async (id, log) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;

    const normalized = normalizeClient(current);
    const currentNutrition = normalized.nutrition || { adherence: [] };
    const currentAdherence = Array.isArray(currentNutrition.adherence)
      ? currentNutrition.adherence
      : [];

    const next = {
      ...currentNutrition,
      adherence: [...currentAdherence, log],
    };

    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nutrition: next }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo guardar log",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? normalizeClient(res.data) : x)));
  };

  const saveMembership = async (id, membershipData) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;

    const normalized = normalizeClient(current);
    const currentMembership = normalized.membership || EMPTY_MEMBERSHIP;

    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        membership: {
          ...currentMembership,
          ...membershipData,
        },
      }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo guardar membresía",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? normalizeClient(res.data) : x)));
  };

  const createClientUser = async () => {
    setUErr("");

    const displayName = uName.trim();
    const username = uUsername.trim();
    const pass = uPassword;

    if (!displayName) return setUErr("Falta nombre del usuario.");
    if (!username) return setUErr("Falta username/login.");
    if (!pass || pass.length < 4) return setUErr("Contraseña mínimo 4 caracteres.");
    if (!uClientId) return setUErr("Selecciona un cliente para asignar.");

    setBusy(true);

    const r = await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify({ username, password: pass, role: "client" }),
    });

    if (!r.ok) {
      setBusy(false);
      setUErr(r.data?.error || "No se pudo crear usuario.");
      return;
    }

    const patch = await apiFetch(`/clients/${Number(uClientId)}`, {
      method: "PATCH",
      body: JSON.stringify({ assignedUserId: r.data.user.id }),
    });

    setBusy(false);

    if (!patch.ok) {
      setUErr(patch.data?.error || "Usuario creado pero no se pudo asignar al cliente.");
      return;
    }

    setClients((prev) =>
      prev.map((c) => (c.id === Number(uClientId) ? normalizeClient(patch.data) : c))
    );
    await refreshUsers();

    setUName("");
    setUUsername("");
    setUPassword("");
    setUClientId("");

    showToast({
      type: "success",
      title: "Usuario creado y asignado",
      message: `${username} → ${patch.data.name}`,
    });
  };

  const assignClientUser = async (clientId, userIdOrNull) => {
    setBusy(true);

    const res = await apiFetch(`/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify({ assignedUserId: userIdOrNull || null }),
    });

    setBusy(false);

    if (!res.ok) {
      showToast({
        type: "error",
        title: "No se pudo asignar",
        message: res.data?.error || "Error",
      });
      return;
    }

    setClients((prev) => prev.map((c) => (c.id === clientId ? normalizeClient(res.data) : c)));
  };

  const exportClientCSV = (clientId) => {
    const c = clients.find((x) => x.id === clientId);
    if (!c) {
      showToast({
        type: "error",
        title: "No encontrado",
        message: "Ese cliente no existe en la lista.",
      });
      return;
    }

    const cc = normalizeClient(c);
    const nutrition = cc.nutrition || {};
    const progress = Array.isArray(cc.progress) ? cc.progress : [];
    const adherence = Array.isArray(nutrition.adherence) ? nutrition.adherence : [];
    const membership = cc.membership || EMPTY_MEMBERSHIP;

    const headers = [
      "id",
      "name",
      "active",
      "assignedUserId",
      "goalWeight",
      "routine",
      "membership_type",
      "membership_start",
      "membership_end",
      "membership_amount",
      "membership_paymentStatus",
      "nutrition_calories",
      "nutrition_protein",
      "nutrition_carbs",
      "nutrition_fats",
      "nutrition_notes",
      "progress_json",
      "adherence_json",
    ];

    const row = [
      cc.id,
      cc.name,
      cc.active ? 1 : 0,
      cc.assignedUserId || "",
      cc.goalWeight || "",
      cc.routine || "",
      membership.type || "",
      membership.start || "",
      membership.end || "",
      membership.amount || "",
      membership.paymentStatus || "",
      nutrition.calories || "",
      nutrition.protein || "",
      nutrition.carbs || "",
      nutrition.fats || "",
      nutrition.notes || "",
      JSON.stringify(progress),
      JSON.stringify(adherence),
    ];

    const csvEscape = (value) => {
      const s = value == null ? "" : String(value);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csvContent =
      "\uFEFF" +
      headers.map(csvEscape).join(",") +
      "\n" +
      row.map(csvEscape).join(",") +
      "\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `client-${cc.id}-${(cc.name || "valhalla").replace(/\s+/g, "_")}.csv`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    showToast({
      type: "success",
      title: "CSV descargado",
      message: `Cliente ${cc.name}`,
    });
  };

  const exportClientPDF = (clientId) => {
    const c = clients.find((x) => x.id === clientId);
    if (!c) {
      showToast({
        type: "error",
        title: "No encontrado",
        message: "Ese cliente no existe en la lista.",
      });
      return;
    }

    const cc = normalizeClient(c);
    const nutrition = cc.nutrition || {};
    const progress = Array.isArray(cc.progress) ? cc.progress : [];
    const adherence = Array.isArray(nutrition.adherence) ? nutrition.adherence : [];
    const membership = cc.membership || EMPTY_MEMBERSHIP;

    const recentProgress = progress.slice(0, 8);
    const recentAdherence = adherence.slice(0, 8);

    const html = `
      <html>
        <head>
          <title>Cliente ${cc.name}</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              background: #111;
              color: #fff;
              padding: 28px;
            }
            .wrap {
              max-width: 900px;
              margin: 0 auto;
            }
            .hero {
              border: 1px solid #2a2a2a;
              border-radius: 18px;
              padding: 20px;
              background: linear-gradient(180deg, #151515, #0d0d0d);
              margin-bottom: 18px;
            }
            h1, h2, h3 {
              margin-top: 0;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
              margin-bottom: 18px;
            }
            .card {
              border: 1px solid #2a2a2a;
              border-radius: 16px;
              padding: 16px;
              background: #151515;
            }
            .label {
              color: #aaa;
              font-size: 12px;
              margin-bottom: 6px;
            }
            .value {
              font-size: 18px;
              font-weight: bold;
            }
            .section {
              border: 1px solid #2a2a2a;
              border-radius: 16px;
              padding: 16px;
              background: #151515;
              margin-bottom: 16px;
            }
            .box {
              white-space: pre-wrap;
              background: #0d0d0d;
              border: 1px solid #2a2a2a;
              border-radius: 12px;
              padding: 12px;
              color: #eee;
            }
            ul {
              padding-left: 18px;
            }
            li {
              margin-bottom: 8px;
            }
            .muted {
              color: #aaa;
            }
            @media print {
              body {
                background: #fff;
                color: #000;
              }
              .hero, .card, .section, .box {
                background: #fff !important;
                color: #000 !important;
                border: 1px solid #ccc !important;
              }
              .label, .muted {
                color: #555 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="hero">
              <h1>Valhalla Gym</h1>
              <h2>Resumen de cliente</h2>
              <p class="muted">Documento generado desde panel admin</p>
            </div>

            <div class="grid">
              <div class="card">
                <div class="label">Cliente</div>
                <div class="value">${cc.name || "-"}</div>
              </div>

              <div class="card">
                <div class="label">Estado</div>
                <div class="value">${cc.active ? "Activo" : "Inactivo"}</div>
              </div>

              <div class="card">
                <div class="label">ID Cliente</div>
                <div class="value">${cc.id}</div>
              </div>

              <div class="card">
                <div class="label">Usuario asignado</div>
                <div class="value">${cc.assignedUserId || "Sin asignar"}</div>
              </div>

              <div class="card">
                <div class="label">Meta de peso</div>
                <div class="value">${cc.goalWeight || "Sin meta"}</div>
              </div>

              <div class="card">
                <div class="label">Membresía</div>
                <div class="value">${membership.type || "Sin plan"}</div>
              </div>

              <div class="card">
                <div class="label">Vigencia</div>
                <div class="value">${membership.start || "-"} → ${membership.end || "-"}</div>
              </div>

              <div class="card">
                <div class="label">Pago</div>
                <div class="value">${membership.paymentStatus || "pending"}</div>
              </div>
            </div>

            <div class="section">
              <h3>Rutina</h3>
              <div class="box">${cc.routine || "Sin rutina registrada"}</div>
            </div>

            <div class="section">
              <h3>Membresía</h3>
              <p><strong>Tipo:</strong> ${membership.type || "-"}</p>
              <p><strong>Inicio:</strong> ${membership.start || "-"}</p>
              <p><strong>Vencimiento:</strong> ${membership.end || "-"}</p>
              <p><strong>Monto:</strong> ${membership.amount || "-"}</p>
              <p><strong>Estado de pago:</strong> ${membership.paymentStatus || "pending"}</p>
            </div>

            <div class="section">
              <h3>Nutrición</h3>
              <p><strong>Calorías:</strong> ${nutrition.calories || "-"}</p>
              <p><strong>Proteína:</strong> ${nutrition.protein || "-"}</p>
              <p><strong>Carbs:</strong> ${nutrition.carbs || "-"}</p>
              <p><strong>Grasas:</strong> ${nutrition.fats || "-"}</p>
              <p><strong>Notas:</strong></p>
              <div class="box">${nutrition.notes || "Sin notas"}</div>
            </div>

            <div class="section">
              <h3>Progreso reciente</h3>
              ${
                recentProgress.length
                  ? `<ul>${recentProgress
                      .map(
                        (p) =>
                          `<li>${p.date || "-"} — ${p.weight || "-"} kg ${p.reps ? `(${p.reps})` : ""}</li>`
                      )
                      .join("")}</ul>`
                  : `<p class="muted">Sin registros</p>`
              }
            </div>

            <div class="section">
              <h3>Bitácora nutricional reciente</h3>
              ${
                recentAdherence.length
                  ? `<ul>${recentAdherence
                      .map(
                        (a) =>
                          `<li>${a.date ? String(a.date).slice(0, 10) : "-"} — ${a.note || "Sin nota"}</li>`
                      )
                      .join("")}</ul>`
                  : `<p class="muted">Sin registros</p>`
              }
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) {
      showToast({
        type: "error",
        title: "Popup bloqueado",
        message: "Permite popups para generar el PDF.",
      });
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 500);

    showToast({
      type: "success",
      title: "PDF listo",
      message: `Documento preparado para ${cc.name}`,
    });
  };

  const exportAdminSummaryPDF = () => {
    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.active).length;
    const inactiveClients = totalClients - activeClients;

    const assignedClients = clients.filter((c) => c.assignedUserId).length;
    const unassignedClients = totalClients - assignedClients;

    const clientsWithoutRoutine = clients.filter(
      (c) => !String(c.routine || "").trim()
    );

    const clientsWithMembership = clients.filter(
      (c) => c.membership && String(c.membership.type || "").trim()
    );

    const pendingPayments = clients.filter(
      (c) => c.membership?.paymentStatus === "pending"
    );

    const overduePayments = clients.filter(
      (c) => c.membership?.paymentStatus === "overdue"
    );

    const allWeights = clients
      .flatMap((c) => c.progress || [])
      .map((p) => Number(p.weight))
      .filter(Boolean);

    const avgWeight = allWeights.length
      ? Math.round(allWeights.reduce((a, b) => a + b, 0) / allWeights.length)
      : null;

    const nutritionLogs = clients.flatMap((c) => c.nutrition?.adherence || []);
    const completedCount = nutritionLogs.filter((d) => d?.completed !== false).length;
    const nutritionGlobalPercent = nutritionLogs.length
      ? Math.round((completedCount / nutritionLogs.length) * 100)
      : 0;

    const recentClients = [...clients]
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 8);

    const recentProgress = clients
      .flatMap((c) =>
        (c.progress || []).map((p) => ({
          clientName: c.name,
          date: p.date,
          weight: p.weight,
          reps: p.reps,
        }))
      )
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 10);

    const html = `
      <html>
        <head>
          <title>Resumen general Valhalla Gym</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              background: #111;
              color: #fff;
              padding: 28px;
            }
            .wrap {
              max-width: 960px;
              margin: 0 auto;
            }
            .hero {
              border: 1px solid #2a2a2a;
              border-radius: 18px;
              padding: 22px;
              background: linear-gradient(180deg, #151515, #0d0d0d);
              margin-bottom: 18px;
            }
            h1, h2, h3 {
              margin-top: 0;
            }
            .muted {
              color: #aaa;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 14px;
              margin-bottom: 18px;
            }
            .card {
              border: 1px solid #2a2a2a;
              border-radius: 16px;
              padding: 16px;
              background: #151515;
            }
            .label {
              color: #aaa;
              font-size: 12px;
              margin-bottom: 6px;
            }
            .value {
              font-size: 22px;
              font-weight: bold;
            }
            .section {
              border: 1px solid #2a2a2a;
              border-radius: 16px;
              padding: 16px;
              background: #151515;
              margin-bottom: 16px;
            }
            ul {
              padding-left: 18px;
            }
            li {
              margin-bottom: 8px;
            }
            @media print {
              body {
                background: #fff;
                color: #000;
              }
              .hero, .card, .section {
                background: #fff !important;
                color: #000 !important;
                border: 1px solid #ccc !important;
              }
              .label, .muted {
                color: #555 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="hero">
              <h1>Valhalla Gym</h1>
              <h2>Resumen general administrativo</h2>
              <p class="muted">Documento generado desde el panel admin</p>
            </div>

            <div class="grid">
              <div class="card">
                <div class="label">Total clientes</div>
                <div class="value">${totalClients}</div>
              </div>
              <div class="card">
                <div class="label">Activos</div>
                <div class="value">${activeClients}</div>
              </div>
              <div class="card">
                <div class="label">Inactivos</div>
                <div class="value">${inactiveClients}</div>
              </div>
              <div class="card">
                <div class="label">Asignados</div>
                <div class="value">${assignedClients}</div>
              </div>
              <div class="card">
                <div class="label">Sin asignar</div>
                <div class="value">${unassignedClients}</div>
              </div>
              <div class="card">
                <div class="label">Sin rutina</div>
                <div class="value">${clientsWithoutRoutine.length}</div>
              </div>
              <div class="card">
                <div class="label">Con membresía</div>
                <div class="value">${clientsWithMembership.length}</div>
              </div>
              <div class="card">
                <div class="label">Pagos pendientes</div>
                <div class="value">${pendingPayments.length}</div>
              </div>
              <div class="card">
                <div class="label">Pagos vencidos</div>
                <div class="value">${overduePayments.length}</div>
              </div>
              <div class="card">
                <div class="label">Peso promedio</div>
                <div class="value">${avgWeight ? `${avgWeight} kg` : "Sin datos"}</div>
              </div>
              <div class="card">
                <div class="label">Adherencia global</div>
                <div class="value">${nutritionGlobalPercent}%</div>
              </div>
              <div class="card">
                <div class="label">Registros nutrición</div>
                <div class="value">${completedCount}/${nutritionLogs.length}</div>
              </div>
            </div>

            <div class="section">
              <h3>Últimos clientes</h3>
              ${
                recentClients.length
                  ? `<ul>${recentClients
                      .map((c) => `<li><strong>${c.name}</strong> · ID ${c.id}</li>`)
                      .join("")}</ul>`
                  : `<p class="muted">Sin clientes recientes</p>`
              }
            </div>

            <div class="section">
              <h3>Progreso reciente</h3>
              ${
                recentProgress.length
                  ? `<ul>${recentProgress
                      .map(
                        (p) =>
                          `<li><strong>${p.clientName}</strong> · ${p.date || "-"} · ${p.weight || "-"} kg ${p.reps ? `(${p.reps})` : ""}</li>`
                      )
                      .join("")}</ul>`
                  : `<p class="muted">Sin progresos recientes</p>`
              }
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1000,height=1200");
    if (!win) {
      showToast({
        type: "error",
        title: "Popup bloqueado",
        message: "Permite popups para generar el PDF.",
      });
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 500);

    showToast({
      type: "success",
      title: "PDF general listo",
      message: "Resumen administrativo preparado.",
    });
  };

  const visibleClients = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = [...clients];

    if (s) list = list.filter((c) => (c.name || "").toLowerCase().includes(s));
    if (statusFilter === "active") list = list.filter((c) => !!c.active);
    if (statusFilter === "inactive") list = list.filter((c) => !c.active);

    if (sortBy === "az") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sortBy === "za") list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    else if (sortBy === "old") list.sort((a, b) => Number(a.id) - Number(b.id));
    else list.sort((a, b) => Number(b.id) - Number(a.id));

    return list;
  }, [clients, search, statusFilter, sortBy]);

  const clientUsers = useMemo(() => users.filter((u) => u.role === "client"), [users]);

  const handleAdminLogout = () => {
    logout();
    window.location.assign("/");
  };

  return (
    <div className="app">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar cliente"
        message={`Vas a eliminar a "${toDelete?.name}". Esto no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setConfirmOpen(false);
          setToDelete(null);
        }}
        onConfirm={confirmDeleteClient}
      />

      <h1>Valhalla Gym</h1>

      <div className="admin-shell">
        <div className="admin-hero">
          <div>
            <small className="client-eyebrow">Panel de administración</small>
            <h2 className="client-hero-title">Centro de control Valhalla</h2>
            <p className="client-hero-subtitle">
              Administra clientes, usuarios, asignaciones, progreso, nutrición, membresías y exportaciones desde un solo lugar.
            </p>
          </div>

          <div className="client-hero-actions">
            <button type="button" onClick={exportAdminSummaryPDF} disabled={busy || loading}>
              Reporte PDF
            </button>

            <button type="button" onClick={handleAdminLogout} disabled={busy}>
              Salir
            </button>

            <button type="button" onClick={loadAll} disabled={loading || busy}>
              {loading ? "Cargando..." : "Recargar"}
            </button>
          </div>
        </div>

        <div className="admin-session-card">
          <div>
            <small className="muted">Sesión</small>
            <div className="client-session-value">
              {user?.username} ({user?.role})
            </div>
          </div>

          <div>
            <small className="muted">Usuarios cliente</small>
            <div className="client-session-value">{clientUsers.length}</div>
          </div>

          <div>
            <small className="muted">Clientes cargados</small>
            <div className="client-session-value">{clients.length}</div>
          </div>

          <div>
            <small className="muted">API</small>
            <div className="client-session-value">{API_URL}</div>
          </div>
        </div>

        <div className="dashboard admin-panel-card">
          <h2>👥 Usuarios</h2>
          <p className="muted admin-panel-copy">
            Crea usuarios cliente y asígnalos de inmediato al perfil correspondiente.
          </p>

          <div className="admin-form-grid">
            <input
              placeholder="Nombre (display)"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
              disabled={busy}
            />
            <input
              placeholder="Username/login (ej: cliente1)"
              value={uUsername}
              onChange={(e) => setUUsername(e.target.value)}
              disabled={busy}
            />
            <input
              placeholder="Password"
              type="password"
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
              disabled={busy}
            />
            <select
              value={uClientId}
              onChange={(e) => setUClientId(e.target.value)}
              disabled={busy}
            >
              <option value="">Asignar a cliente…</option>
              {clients
                .slice()
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <button type="button" onClick={createClientUser} disabled={busy}>
              {busy ? "Guardando..." : "Crear + Asignar"}
            </button>
          </div>

          {uErr && <div className="client-alert error" style={{ marginTop: 12 }}>{uErr}</div>}
        </div>

        <Dashboard clients={clients} />

        <div className="dashboard admin-panel-card">
          <h2>⚙️ Gestión de clientes</h2>
          <p className="muted admin-panel-copy">
            Filtra, ordena y localiza rápidamente a tus clientes para administrar sus datos.
          </p>

          <div className="admin-filter-grid">
            <input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={busy}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={busy}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={busy}
            >
              <option value="recent">Más recientes</option>
              <option value="old">Más antiguos</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setSortBy("recent");
              }}
              disabled={busy}
            >
              Limpiar
            </button>
          </div>

          <small className="muted" style={{ marginTop: 12, display: "block" }}>
            Mostrando {visibleClients.length} de {clients.length} clientes
            {busy ? " · Guardando…" : ""}
          </small>
        </div>

        <div className="dashboard admin-panel-card">
          <h2>➕ Nuevo cliente</h2>
          <p className="muted admin-panel-copy">
            Crea un nuevo perfil para comenzar a gestionar su rutina, progreso, nutrición y membresía.
          </p>

          <ClientForm
            name={name}
            setName={setName}
            initialWeight={initialWeight}
            setInitialWeight={setInitialWeight}
            initialDate={initialDate}
            setInitialDate={setInitialDate}
            addClient={addClient}
          />
        </div>

        <ul style={{ padding: 0 }}>
          {loading ? (
            <div className="dashboard">Cargando…</div>
          ) : (
            visibleClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                users={clientUsers}
                onAssignUser={assignClientUser}
                busy={busy}
                toggleStatus={toggleStatus}
                deleteClient={() => requestDeleteClient(client)}
                saveRoutine={saveRoutine}
                addProgress={addProgress}
                saveNutrition={saveNutrition}
                addNutritionLog={addNutritionLog}
                saveGoalWeight={saveGoalWeight}
                saveMembership={saveMembership}
                exportClientCSV={exportClientCSV}
                exportClientPDF={exportClientPDF}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}