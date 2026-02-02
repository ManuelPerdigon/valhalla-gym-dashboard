export const users = [
  {
    id: 1,
    role: "admin",
    name: "Admin",
    email: "admin@valhalla.com",
    password: "admin123",
    clientId: null,
  },
  {
    id: 2,
    role: "client",
    name: "Cliente Demo",
    email: "cliente@valhalla.com",
    password: "cliente123",
    // Este clientId debe coincidir con el id del cliente en tu app (localStorage)
    clientId: null,
  },
];