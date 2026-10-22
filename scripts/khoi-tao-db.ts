// Khởi tạo schema vào DB mgm_max (tạo DB trước bằng: createdb mgm_max)
// và dựng sẵn tài khoản quản trị đầu tiên để không ai bị khoá ngoài hệ thống.
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { bamMatKhau } from "../src/core/mat-khau";

const url = process.env.DATABASE_URL || "postgres://localhost:5432/mgm_max";
const pool = new Pool({ connectionString: url });

const EMAIL_ADMIN = (process.env.ADMIN_EMAIL || "ai@taki.vn").trim().toLowerCase();
const MAT_KHAU_ADMIN = process.env.ADMIN_MAT_KHAU || "mgmmax123";

async function main() {
  const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
  console.log("✓ Schema đã áp vào", url);

  // Chỉ tạo khi CHƯA có quản trị viên nào — không ghi đè mật khẩu người đang dùng.
  const { rows } = await pool.query(`select count(*) as so from quan_tri where bat`);
  if (Number(rows[0]?.so || 0) === 0) {
    await pool.query(
      `insert into quan_tri (email, ten, mat_khau) values ($1,$2,$3)
       on conflict (email) do update set bat=true, mat_khau=excluded.mat_khau`,
      [EMAIL_ADMIN, EMAIL_ADMIN.split("@")[0], bamMatKhau(MAT_KHAU_ADMIN)]
    );
    console.log(`✓ Đã tạo quản trị viên đầu tiên: ${EMAIL_ADMIN} (mật khẩu = ADMIN_MAT_KHAU)`);
  } else {
    console.log("✓ Đã có quản trị viên, bỏ qua bước tạo");
  }
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
