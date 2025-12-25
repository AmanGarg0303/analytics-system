import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import redis from "./redis.js";

dotenv.config();

const { Pool } = pkg;
const PORT = process.env.PORT || 8000;

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

pool.on("connect", () => {
  console.log("Postgres connected.");
});

const app = express();
app.use(express.text({ type: "*/*" }));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type"],
    methods: ["GET", "POST", "OPTIONS"],
  })
);

const createClicksTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS button_clicks_daily (
        button_name TEXT,
        date DATE,
        click_count BIGINT NOT NULL,
        PRIMARY KEY (button_name, date)
      );
    `);
    console.log("Table button_clicks_daily is ready ✅");
  } catch (err) {
    console.error("Error creating table:", err);
  }
};

const flushClicksToPostgres = async () => {
  const keys = await redis.keys("button:clicks:*");

  for (const key of keys) {
    const [, , buttonName, date] = key.split(":");

    const count = parseInt(await redis.getset(key, "0"), 10);

    if (count > 0) {
      await pool.query(
        `
        INSERT INTO button_clicks_daily (button_name, date, click_count)
        VALUES ($1, $2, $3)
        ON CONFLICT (button_name, date)
        DO UPDATE SET click_count = button_clicks_daily.click_count + EXCLUDED.click_count
        `,
        [buttonName, date, count]
      );
    }
  }
};

// server test
app.get("/dummy", (req, res) => {
  res.status(200).json({ message: "Dummy route check." });
});

// redis test
app.get("/redis", async (req, res) => {
  await redis.set("msg", "Hello from redis");
  const value = await redis.get("msg");
  res.status(200).json({ redisValue: value });
});

// postgres test
app.get("/postgres", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.status(200).json({ time: result.rows[0].now });
});

// redis + postgres test
app.get("/combo", async (req, res) => {
  const dbRes = await pool.query("SELECT NOW()");
  await redis.set("last_db_check", dbRes.rows[0].now);
  res.json({
    postgresTime: dbRes.rows[0].now,
    cacheInRedis: await redis.get("last_db_check"),
  });
});

app.post("/api/trackClicks", async (req, res) => {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const date = new Date().toISOString().slice(0, 10);

    await redis.incr(`button:clicks:${body.btnName}:${date}`);
    res.sendStatus(204); // no response body, very fast
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid payload" });
  }
});

app.get("/api/buttonClicks", async (req, res) => {
  const dbRes = await pool.query(`
    SELECT button_name, SUM(click_count) AS total_clicks 
    FROM button_clicks_daily 
    GROUP BY button_name
    `);

  const redisKeys = await redis.keys("button:clicks:*");

  const redisCounts = {};

  for (const key of redisKeys) {
    const [, , buttonName, date] = key.split(":");
    const count = parseInt(await redis.get(key), 10) || 0;

    if (redisCounts[buttonName]) {
      redisCounts[buttonName] += count;
    } else {
      redisCounts[buttonName] = count;
    }
  }

  const result = {};
  dbRes.rows.forEach((row) => {
    result[row.button_name] = parseInt(row.total_clicks, 10);
  });

  Object.keys(redisCounts).forEach((btn) => {
    if (result[btn]) {
      result[btn] += redisCounts[btn];
    } else {
      result[btn] = redisCounts[btn];
    }
  });

  res.status(200).json(result);
});

// manual flushing to db
app.post("/api/flushClicks", async (req, res) => {
  await flushClicksToPostgres();
  res.json({ message: "Flushed clicks successfully" });
});

process.on("SIGTERM", async () => {
  console.log("Server shutting down, flushing clicks...");
  await flushClicksToPostgres();
  process.exit(0);
});

setInterval(async () => {
  try {
    await flushClicksToPostgres();
    console.log("Flushed Redis counts to Postgres ✅");
  } catch (err) {
    console.error("Error flushing clicks:", err);
  }
}, 5 * 60 * 1000); // 5 minutes

app.listen(PORT, async () => {
  await createClicksTable();
  console.log(`Server running on port ${PORT}`);
});
