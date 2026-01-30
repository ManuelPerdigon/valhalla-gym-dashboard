function ClientForm({ name, setName, addClient }) {
  return (
    <>
      <input
        placeholder="Nombre del cliente"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={addClient}>Agregar cliente</button>
      <hr />
    </>
  );
}

export default ClientForm;
