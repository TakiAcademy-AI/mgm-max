// Khởi tạo schema vào DB mgm_max (tạo DB trước bằng: createdb mgm_max)
// và dựng sẵn tài khoản quản trị đầu tiên để không ai bị khoá ngoài hệ thống.
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { bamMatKhau } from "../src/core/mat-khau";

const url = process.env.DATABASE_URL || "postgres://localhost:5432/mgm_max";
const pool = new Pool({ connectionString: url });

const EMAIL_ADMIN = (process.env.ADMIN_EMAIL || "ai@taki.vn").trim().toLowerCase();
const MAT_KHAU_ADMIN = process.env.ADMIN_MAT_KHAU || "mgmmax123";
// Cứu khi quản trị viên quên/mất mật khẩu: đặt ADMIN_RESET_EMAIL=<email> rồi deploy lại.
// Chỉ chạy MỘT LẦN cho mỗi giá trị (ghi dấu vào cai_dat) nên để quên biến cũng không
// bị ghi đè mật khẩu ở những lần deploy sau.
const EMAIL_RESET = (process.env.ADMIN_RESET_EMAIL || "").trim().toLowerCase();

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

  if (EMAIL_RESET) {
    const dau = `reset:${EMAIL_RESET}`;
    const { rows: d } = await pool.query(`select gia_tri from cai_dat where khoa='admin_reset_dau'`);
    if (d[0]?.gia_tri === dau) {
      console.log(`✓ Đã đặt lại mật khẩu cho ${EMAIL_RESET} ở lần trước, bỏ qua`);
    } else {
      const { rowCount } = await pool.query(
        `update quan_tri set mat_khau=$2, bat=true, lan_sai=0, khoa_den=null, doi_mk_luc=now()
         where email=$1`, [EMAIL_RESET, bamMatKhau(MAT_KHAU_ADMIN)]);
      if (rowCount) {
        await pool.query(
          `insert into cai_dat (khoa, gia_tri) values ('admin_reset_dau',$1)
           on conflict (khoa) do update set gia_tri=excluded.gia_tri`, [dau]);
        console.log(`✓ ĐÃ ĐẶT LẠI mật khẩu cho ${EMAIL_RESET} = ADMIN_MAT_KHAU`);
      } else {
        console.log(`! Không tìm thấy quản trị viên ${EMAIL_RESET} để đặt lại`);
      }
    }
  }

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
