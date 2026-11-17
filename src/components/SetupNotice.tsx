// .env.local doldurulmadan uygulama açılırsa gösterilir (çökme yerine yol gösterir)
export function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-xl space-y-3 text-sm">
        <h1 className="text-xl font-black">Kurulum gerekli</h1>
        <p>Uygulamanın veritabanına bağlanabilmesi için Supabase bilgileri henüz girilmemiş.</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>supabase.com’da ücretsiz bir proje açın.</li>
          <li>SQL Editor’de <code>supabase/migrations</code> klasöründeki iki dosyayı sırayla çalıştırın.</li>
          <li><code>.env.example</code> dosyasını <code>.env.local</code> adıyla kopyalayıp Project Settings → API’deki değerleri girin.</li>
          <li>Sunucuyu yeniden başlatın (<code>npm run dev</code>).</li>
        </ol>
        <p className="text-slate-500">Ayrıntılı adımlar: proje klasöründeki README.md.</p>
      </div>
    </div>
  );
}
