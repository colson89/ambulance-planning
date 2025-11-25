import pg from "pg";

const pool = new pg.Pool({
  connectionString: "postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning",
});

const hashedPassword = "01215d567937b83c82180713fc201036b73694dd0e1dcd22873d6710f802d4f79e1f581968ffdfdfc8e43dc7d76c5b62739331c0f2ce7681416a052ecdeee0f0.9eecea767e3210051216425ef43ac2ce";

async function updatePassword() {
  try {
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE username = $2",
      [hashedPassword, "jeva400"]
    );
    console.log("Wachtwoord bijgewerkt!");
    console.log("Rijen aangepast:", result.rowCount);
  } catch (error) {
    console.error("Fout:", error.message);
  } finally {
    await pool.end();
  }
}

updatePassword();
