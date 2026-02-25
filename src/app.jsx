export default function App() {

  function loginWithPatreon() {
    window.location.href = "/.netlify/functions/patreon-auth";
  }

  function testReact() {
    alert("React working");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b0b0b",
        color: "#ffffff",
        padding: "40px",
        fontFamily: "serif"
      }}
    >
      <h1>Maple Sap Predictor</h1>

      <p>Frontend running.</p>

      <div style={{ marginTop: "20px" }}>
        <button onClick={testReact} style={{ marginRight: "10px" }}>
          Test Button
        </button>

        <button onClick={loginWithPatreon}>
          Login with Patreon
        </button>
      </div>

      <div style={{ marginTop: "40px" }}>
        <p>Location: Sudbury, ON (46.49, -81.01)</p>
        <p>Live weather loaded.</p>

        <h2 style={{ marginTop: "30px" }}>7-Day Forecast + Sap Index</h2>

        <table style={{ marginTop: "20px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ paddingRight: "20px" }}>Date</th>
              <th style={{ paddingRight: "20px" }}>Min (C)</th>
              <th style={{ paddingRight: "20px" }}>Max (C)</th>
              <th style={{ paddingRight: "20px" }}>Precip (mm)</th>
              <th style={{ paddingRight: "20px" }}>Solar (kWh/m2)</th>
              <th>Sap Index</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>2026-02-25</td>
              <td>-12.8</td>
              <td>-2.6</td>
              <td>2.0</td>
              <td>9.23</td>
              <td>25</td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: "20px", opacity: "0.7" }}>
          Sap Index is a baseline score (0-100) driven by freeze/thaw + solar.
        </p>
      </div>
    </div>
  );
}
