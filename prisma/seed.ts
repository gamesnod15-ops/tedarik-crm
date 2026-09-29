import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Sistem Yöneticisi";

  if (!email || password.length < 10) {
    console.error(
      "SEED_ADMIN_EMAIL ve en az 10 karakterlik SEED_ADMIN_PASSWORD .env içinde tanımlı olmalı."
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Yönetici zaten var (${email}); şifresine dokunulmadı.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true, // ilk girişte şifre değiştirilsin
    },
  });
  console.log(`Yönetici oluşturuldu: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
