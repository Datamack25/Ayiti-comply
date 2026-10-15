/* Dossier Haïti — toutes les données viennent des fichiers CSV du dossier data/ */
(function () {
  "use strict";

  const FILES = [
    "textes", "pays_fiche", "sources",
    "lcbft_cadre_legal", "lcbft_acteurs", "lcbft_plan_action_gafi", "lcbft_sanctions", "lcbft_risques",
    "entreprise_formes", "entreprise_etapes", "entreprise_conseils",
    "banques_institutions", "banques_paiements", "banques_indicateurs", "banques_enjeux",
    "industries_secteurs", "industries_produits", "industries_commerce",
    "voyage_alertes", "voyage_formalites", "voyage_acces", "voyage_sante", "voyage_pratique"
  ];

  const D = {};       // données chargées
  const T = {};       // textes
  let SRC_NUM = {};   // id source -> numéro affiché

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function loadCSV(name) {
    // Version Streamlit : les CSV sont injectés directement dans la page
    if (window.__CSV_DATA && window.__CSV_DATA[name] != null) {
      const r = Papa.parse(window.__CSV_DATA[name], { header: true, skipEmptyLines: true });
      return Promise.resolve(r.data);
    }
    return new Promise((resolve, reject) => {
      Papa.parse("data/" + name + ".csv", {
        download: true, header: true, skipEmptyLines: true,
        complete: (r) => resolve(r.data),
        error: (err) => reject(new Error(name + ".csv : " + (err && err.message ? err.message : "lecture impossible")))
      });
    });
  }

  function ref(id) {
    if (!id || !SRC_NUM[id]) return "";
    return ' <a class="ref" href="#src-' + esc(id) + '" title="Voir la source">[' + SRC_NUM[id] + "]</a>";
  }

  function levelChip(level) {
    const l = (level || "").toLowerCase();
    let cls = "chip-info";
    if (l.startsWith("élevé") || l.startsWith("formellement")) cls = "chip-high";
    else if (l.startsWith("moyen") || l.startsWith("vigilance")) cls = "chip-mid";
    return '<span class="chip ' + cls + '">' + esc(level) + "</span>";
  }

  function table(el, cols, rows) {
    const head = "<thead><tr>" + cols.map((c) => "<th scope=\"col\">" + esc(c.label) + "</th>").join("") + "</tr></thead>";
    const body = "<tbody>" + rows.map((r) => "<tr>" + cols.map((c) =>
      "<td>" + (c.html ? c.html(r) : esc(r[c.key])) + "</td>").join("") + "</tr>").join("") + "</tbody>";
    el.innerHTML = head + body;
  }

  function tips(el, rows, k, v) {
    el.innerHTML = rows.map((r) => "<div><dt>" + esc(r[k]) + "</dt><dd>" + esc(r[v]) + "</dd></div>").join("");
  }

  function figures(el, rows) {
    el.innerHTML = rows.map((r) =>
      '<div class="figure"><div class="v">' + esc(r.valeur) + '</div><div class="l">' + esc(r.indicateur) +
      ref(r.source_id) + '</div><div class="y">' + esc(r.annee) + "</div></div>").join("");
  }

  function filters(container, values, onChange) {
    const all = ["Tout"].concat(values);
    container.innerHTML = all.map((v, i) =>
      '<button type="button" aria-pressed="' + (i === 0) + '" data-v="' + esc(v) + '">' + esc(v) + "</button>").join("");
    container.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      container.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      onChange(b.dataset.v === "Tout" ? null : b.dataset.v);
    });
  }

  const uniq = (rows, key) => [...new Set(rows.map((r) => r[key]))];

  /* ---------- Rendu ---------- */
  function render() {
    document.querySelectorAll("[data-text]").forEach((el) => {
      const k = el.dataset.text;
      if (T[k]) el.textContent = T[k];
    });

    D.sources.forEach((s, i) => { SRC_NUM[s.id] = i + 1; });

    $("#fiche-pays").innerHTML = D.pays_fiche.map((r) => {
      const risk = /grise|haut risque|déconseillé/i.test(r.libelle + r.valeur) ? ' class="risk"' : "";
      return "<div" + risk + "><dt>" + esc(r.libelle) + "</dt><dd>" + esc(r.valeur) + ref(r.source_id) +
        (r.precision ? "<small>" + esc(r.precision) + "</small>" : "") + "</dd></div>";
    }).join("");

    // LCB-FT
    const cadre = D.lcbft_cadre_legal;
    $("#lcbft-cadre").innerHTML = cadre.map((r, i) =>
      '<li class="' + (i >= cadre.length - 5 ? "current" : "") + '"><span class="date">' + esc(r.date) + "</span>" +
      '<span class="title">' + esc(r.texte) + ref(r.source_id) + "</span><p>" + esc(r.objet) + ". " + esc(r.portee) + ".</p></li>").join("");

    $("#lcbft-acteurs").innerHTML = D.lcbft_acteurs.map((r) =>
      '<div class="actor"><div class="type">' + esc(r.type) + '</div><div class="sigle">' + esc(r.sigle) +
      '</div><div class="nom">' + esc(r.nom) + "</div><p>" + esc(r.role) + "</p></div>").join("");

    $("#lcbft-plan").innerHTML = D.lcbft_plan_action_gafi.map((r) => "<li>" + esc(r.point) + "</li>").join("");

    table($("#lcbft-sanctions"), [
      { label: "Date", key: "date" },
      { label: "Autorité", key: "autorite" },
      { label: "Mesure", html: (r) => esc(r.mesure) + ref(r.source_id) },
      { label: "Cible", key: "cible" }
    ], D.lcbft_sanctions);

    const riskCols = [
      { label: "Typologie", html: (r) => "<strong>" + esc(r.typologie) + "</strong>" },
      { label: "Description", key: "description" },
      { label: "Signaux d'alerte", key: "signaux_alerte" },
      { label: "Niveau", html: (r) => levelChip(r.niveau) }
    ];
    const drawRisks = (lvl) => table($("#lcbft-risques"), riskCols,
      D.lcbft_risques.filter((r) => !lvl || r.niveau === lvl));
    drawRisks(null);
    filters($("#filtre-risques"), uniq(D.lcbft_risques, "niveau"), drawRisks);

    // Entreprise
    table($("#entreprise-formes"), [
      { label: "Forme", html: (r) => "<strong>" + esc(r.forme) + "</strong><br>" + esc(r.nom_complet) },
      { label: "Associés", key: "associes" },
      { label: "Responsabilité", key: "responsabilite" },
      { label: "Pour qui", key: "pour_qui" }
    ], D.entreprise_formes);

    $("#entreprise-etapes").innerHTML = D.entreprise_etapes
      .sort((a, b) => Number(a.ordre) - Number(b.ordre))
      .map((r) => '<li><div><h4>' + esc(r.etape) + '</h4><div class="org">' + esc(r.organisme) + "</div><p>" +
        esc(r.detail) + '</p><div class="meta"><span>Documents : ' + esc(r.documents) +
        "</span><span>Délai indicatif : " + esc(r.delai_indicatif) + "</span></div></div></li>").join("");

    tips($("#entreprise-conseils"), D.entreprise_conseils, "theme", "conseil");

    // Banques
    figures($("#banques-indicateurs"), D.banques_indicateurs);
    const bankCols = [
      { label: "Institution", html: (r) => "<strong>" + esc(r.nom) + "</strong>" + (r.sigle && r.sigle !== r.nom ? " (" + esc(r.sigle) + ")" : "") },
      { label: "Catégorie", key: "categorie" },
      { label: "Statut", key: "statut" },
      { label: "À savoir", key: "notes" }
    ];
    const drawBanks = (cat) => table($("#banques-institutions"), bankCols,
      D.banques_institutions.filter((r) => !cat || r.categorie === cat));
    drawBanks(null);
    filters($("#filtre-banques"), uniq(D.banques_institutions, "categorie"), drawBanks);

    table($("#banques-paiements"), [
      { label: "Service", html: (r) => "<strong>" + esc(r.service) + "</strong>" },
      { label: "Opérateur", key: "operateur" },
      { label: "Description", key: "description" }
    ], D.banques_paiements);
    tips($("#banques-enjeux"), D.banques_enjeux, "enjeu", "description");

    // Industries
    figures($("#industries-commerce"), D.industries_commerce);
    $("#industries-secteurs").innerHTML = D.industries_secteurs.map((r) =>
      '<div class="sector"><div><h4>' + esc(r.secteur) + '</h4><div class="poids">' + esc(r.poids) + "</div></div>" +
      "<div><p>" + esc(r.description) + '</p><div class="meta">Où : ' + esc(r.lieux) + " — Marchés : " + esc(r.marches) +
      "</div></div></div>").join("");

    const drawProducts = (cat) => {
      $("#industries-produits").innerHTML = D.industries_produits
        .filter((r) => !cat || r.categorie === cat)
        .map((r) => '<article class="product"><span class="chip chip-info">' + esc(r.categorie) + "</span><h4>" +
          esc(r.produit) + "</h4><p>" + esc(r.description) + '</p><p class="fact">' + esc(r.fait_marquant) + "</p></article>")
        .join("");
    };
    drawProducts(null);
    filters($("#filtre-produits"), uniq(D.industries_produits, "categorie"), drawProducts);

    // Voyage
    table($("#voyage-alertes"), [
      { label: "Niveau", html: (r) => levelChip(r.niveau) },
      { label: "Zone", html: (r) => "<strong>" + esc(r.zone) + "</strong>" },
      { label: "Consigne", key: "consigne" }
    ], D.voyage_alertes);
    table($("#voyage-acces"), [
      { label: "Accès", html: (r) => "<strong>" + esc(r.mode) + "</strong>" },
      { label: "Statut", key: "statut" },
      { label: "Détail", key: "detail" }
    ], D.voyage_acces);
    tips($("#voyage-formalites"), D.voyage_formalites, "rubrique", "information");
    tips($("#voyage-sante"), D.voyage_sante, "rubrique", "recommandation");
    tips($("#voyage-pratique"), D.voyage_pratique, "theme", "conseil");

    // Sources
    $("#sources-list").innerHTML = D.sources.map((s) =>
      '<li id="src-' + esc(s.id) + '"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.titre) +
      "</a> — " + esc(s.editeur) + (s.date ? ", " + esc(s.date) : "") + "</li>").join("");
  }

  /* ---------- Navigation active ---------- */
  function scrollSpy() {
    const links = [...document.querySelectorAll(".toc a")];
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((a) => a.classList.remove("active"));
          const a = map.get(e.target.id);
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) obs.observe(s); });
  }

  /* ---------- PDF (pdfmake, construit à partir des mêmes CSV) ---------- */
  const C = { ink: "#10203f", soft: "#4b5670", blue: "#00209f", red: "#c8102e", line: "#d8dde7", wash: "#eef1f8" };

  const tableLayout = {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => C.line,
    fillColor: (i) => (i === 0 ? C.wash : null),
    paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 5, paddingBottom: () => 5
  };

  function pTable(headers, rows, widths) {
    return {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: widths || headers.map(() => "*"),
        body: [headers.map((h) => ({ text: h, bold: true, color: C.soft, fontSize: 8.5 }))]
          .concat(rows.map((r) => r.map((c) => (typeof c === "object" ? c : { text: String(c == null ? "" : c), fontSize: 9 }))))
      },
      layout: tableLayout,
      margin: [0, 0, 0, 14]
    };
  }

  const h2 = (t) => ({ text: t, style: "h2", tocItem: true, tocStyle: { fontSize: 11 } });
  const h3 = (t) => ({ text: t, style: "h3" });
  const para = (t, extra) => Object.assign({ text: t || "", style: "body" }, extra || {});
  const kv = (rows, k, v) => pTable(["", ""], rows.map((r) => [{ text: r[k], bold: true, fontSize: 9 }, r[v]]), [130, "*"]);
  const lvl = (t) => ({ text: t, fontSize: 9, bold: true, color: /élevé|formellement/i.test(t) ? C.red : (/moyen|vigilance/i.test(t) ? "#9a5b00" : C.blue) });

  const SECTIONS = {
    lcbft: () => [
      h2("Système LCB-FT"),
      para(T.lcbft_intro), para(T.lcbft_vigilance, { color: C.blue }),
      h3("Cadre juridique"),
      pTable(["Date", "Texte", "Objet"], D.lcbft_cadre_legal.map((r) => [{ text: r.date, bold: true, fontSize: 9 }, r.texte, r.objet + ". " + r.portee + "."]), [62, 150, "*"]),
      h3("Acteurs du dispositif"),
      pTable(["Sigle", "Nom", "Rôle"], D.lcbft_acteurs.map((r) => [{ text: r.sigle, bold: true, fontSize: 9 }, r.nom, r.role]), [70, 140, "*"]),
      h3("Plan d'action GAFI restant (juin 2026)"),
      { ol: D.lcbft_plan_action_gafi.map((r) => ({ text: r.point, fontSize: 9.5, margin: [0, 0, 0, 3] })), margin: [0, 0, 0, 12] },
      h3("Sanctions internationales"),
      pTable(["Date", "Autorité", "Mesure", "Cible"], D.lcbft_sanctions.map((r) => [r.date, r.autorite, r.mesure, r.cible]), [55, 80, "*", 120]),
      h3("Typologies et signaux d'alerte"),
      pTable(["Typologie", "Description", "Signaux d'alerte", "Niveau"], D.lcbft_risques.map((r) => [{ text: r.typologie, bold: true, fontSize: 9 }, r.description, r.signaux_alerte, lvl(r.niveau)]), [90, "*", "*", 45])
    ],
    entreprise: () => [
      h2("Créer une entreprise de A à Z"),
      para(T.entreprise_intro),
      h3("Formes juridiques"),
      pTable(["Forme", "Associés", "Responsabilité", "Pour qui"], D.entreprise_formes.map((r) => [{ text: r.forme + " – " + r.nom_complet, bold: true, fontSize: 9 }, r.associes, r.responsabilite, r.pour_qui]), [110, 95, 75, "*"]),
      h3("Les étapes"),
      pTable(["N°", "Étape et organisme", "Détail", "Délai"], D.entreprise_etapes.map((r) => [
        { text: r.ordre, bold: true, color: C.blue, fontSize: 11 },
        { stack: [{ text: r.etape, bold: true, fontSize: 9 }, { text: r.organisme, color: C.blue, fontSize: 8.5 }] },
        { stack: [{ text: r.detail, fontSize: 9 }, { text: "Documents : " + r.documents, color: C.soft, fontSize: 8, margin: [0, 2, 0, 0] }] },
        r.delai_indicatif]), [20, 120, "*", 70]),
      h3("Conseils pratiques"),
      kv(D.entreprise_conseils, "theme", "conseil")
    ],
    banques: () => [
      h2("Système bancaire"),
      para(T.banques_intro),
      h3("Indicateurs clés"),
      pTable(["Indicateur", "Valeur", "Année"], D.banques_indicateurs.map((r) => [r.indicateur, { text: r.valeur, bold: true, fontSize: 9 }, r.annee]), ["*", 100, 60]),
      h3("Institutions"),
      pTable(["Institution", "Catégorie", "Statut", "À savoir"], D.banques_institutions.map((r) => [{ text: r.nom, bold: true, fontSize: 9 }, r.categorie, r.statut, r.notes]), [110, 75, 65, "*"]),
      h3("Paiements et mobile money"),
      pTable(["Service", "Opérateur", "Description"], D.banques_paiements.map((r) => [{ text: r.service, bold: true, fontSize: 9 }, r.operateur, r.description]), [100, 80, "*"]),
      h3("Enjeux du secteur"),
      kv(D.banques_enjeux, "enjeu", "description")
    ],
    industries: () => [
      h2("Industries et produits"),
      para(T.industries_intro),
      h3("Commerce extérieur"),
      pTable(["Indicateur", "Valeur", "Année"], D.industries_commerce.map((r) => [r.indicateur, { text: r.valeur, bold: true, fontSize: 9 }, r.annee]), ["*", 100, 60]),
      h3("Secteurs"),
      pTable(["Secteur", "Description", "Lieux", "Marchés"], D.industries_secteurs.map((r) => [{ stack: [{ text: r.secteur, bold: true, fontSize: 9 }, { text: r.poids, color: C.blue, fontSize: 8 }] }, r.description, r.lieux, r.marches]), [95, "*", 100, 70]),
      h3("Produits"),
      pTable(["Produit", "Catégorie", "Description", "Fait marquant"], D.industries_produits.map((r) => [{ text: r.produit, bold: true, fontSize: 9 }, r.categorie, r.description, r.fait_marquant]), [95, 65, "*", "*"])
    ],
    voyage: () => [
      h2("Voyager en Haïti"),
      { table: { widths: ["*"], body: [[{ text: T.voyage_intro, color: C.red, bold: true, fontSize: 10, margin: [8, 6, 8, 6] }]] },
        layout: { hLineColor: () => C.red, vLineColor: () => C.red, hLineWidth: () => 1, vLineWidth: () => 1 }, margin: [0, 0, 0, 12] },
      h3("Zones et niveaux de vigilance"),
      pTable(["Niveau", "Zone", "Consigne"], D.voyage_alertes.map((r) => [lvl(r.niveau), { text: r.zone, bold: true, fontSize: 9 }, r.consigne]), [85, 160, "*"]),
      h3("Comment arriver"),
      pTable(["Accès", "Statut", "Détail"], D.voyage_acces.map((r) => [{ text: r.mode, bold: true, fontSize: 9 }, r.statut, r.detail]), [130, 110, "*"]),
      h3("Formalités d'entrée"), kv(D.voyage_formalites, "rubrique", "information"),
      h3("Santé"), kv(D.voyage_sante, "rubrique", "recommandation"),
      h3("Sur place"), kv(D.voyage_pratique, "theme", "conseil")
    ],
    sources: () => [
      h2("Sources"),
      { ol: D.sources.map((s) => ({ text: [{ text: s.titre, bold: true }, " — " + s.editeur + (s.date ? ", " + s.date : "") + "\n", { text: s.url, color: C.blue, link: s.url, fontSize: 7.5 }], fontSize: 8.5, margin: [0, 0, 0, 4] })) },
      para(T.avertissement, { color: C.soft, margin: [0, 12, 0, 0], fontSize: 9 })
    ]
  };

  function cover(sectionTitle) {
    return [
      { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 6, color: C.blue }, { type: "rect", x: 0, y: 6, w: 515, h: 6, color: C.red }], margin: [0, 0, 0, 30] },
      { text: T.titre || "Dossier Haïti", fontSize: 34, bold: true, color: C.ink },
      sectionTitle ? { text: sectionTitle, fontSize: 18, color: C.blue, margin: [0, 6, 0, 0] } : "",
      { text: T.sous_titre || "", fontSize: 11.5, color: C.soft, margin: [0, 12, 0, 6] },
      { text: "Mise à jour : " + (T.mise_a_jour || ""), fontSize: 9.5, color: C.soft, margin: [0, 0, 0, 24] },
      { text: "Fiche signalétique", style: "h3" },
      pTable(["", ""], D.pays_fiche.map((r) => [
        { text: r.libelle, color: C.soft, fontSize: 9 },
        { stack: [{ text: r.valeur, bold: true, fontSize: 9.5, color: /grise|haut risque|déconseillé/i.test(r.libelle + r.valeur) ? C.red : C.ink }, r.precision ? { text: r.precision, fontSize: 8, color: C.soft } : ""] }
      ]), [140, "*"])
    ];
  }

  function buildDoc(only) {
    const titles = { lcbft: "Système LCB-FT", entreprise: "Créer une entreprise", banques: "Système bancaire", industries: "Industries et produits", voyage: "Voyager en Haïti" };
    let content = cover(only ? titles[only] : null);
    const keys = only ? [only] : ["lcbft", "entreprise", "banques", "industries", "voyage", "sources"];
    if (!only) {
      content.push({ text: "", pageBreak: "after" });
      content.push({ toc: { title: { text: "Sommaire", style: "h2" } } });
    }
    keys.forEach((k) => {
      const sec = SECTIONS[k]();
      sec[0].pageBreak = "before";
      content = content.concat(sec);
    });
    if (only) content.push(para(T.avertissement, { color: C.soft, margin: [0, 16, 0, 0], fontSize: 8.5 }));

    return {
      pageSize: "A4",
      pageMargins: [40, 50, 40, 50],
      info: { title: (T.titre || "Dossier Haïti") + (only ? " – " + titles[only] : ""), author: "Dossier Haïti" },
      header: (page) => page === 1 ? null : { text: T.titre || "Dossier Haïti", fontSize: 8, color: C.soft, margin: [40, 22, 40, 0] },
      footer: (page, count) => ({ columns: [
        { text: "Sources et mise à jour : " + (T.mise_a_jour || ""), fontSize: 7.5, color: C.soft },
        { text: page + " / " + count, alignment: "right", fontSize: 7.5, color: C.soft }
      ], margin: [40, 16, 40, 0] }),
      content,
      styles: {
        h2: { fontSize: 20, bold: true, color: C.ink, margin: [0, 0, 0, 10] },
        h3: { fontSize: 12.5, bold: true, color: C.blue, margin: [0, 10, 0, 6] },
        body: { fontSize: 10, lineHeight: 1.3, margin: [0, 0, 0, 8], color: C.ink }
      },
      defaultStyle: { font: "Roboto", color: C.ink }
    };
  }

  function exportPDF(only, btn) {
    const status = $("#pdf-status");
    if (typeof pdfMake === "undefined") {
      status.textContent = "La bibliothèque PDF n'a pas pu se charger. Vérifiez votre connexion puis réessayez.";
      return;
    }
    btn.disabled = true;
    status.textContent = "Création du PDF…";
    try {
      const name = "dossier-haiti" + (only ? "-" + only : "") + ".pdf";
      pdfMake.createPdf(buildDoc(only)).download(name, () => {
        btn.disabled = false;
        status.textContent = "PDF téléchargé.";
      });
    } catch (e) {
      btn.disabled = false;
      status.textContent = "Le PDF n'a pas pu être créé : " + e.message;
    }
  }

  /* ---------- Démarrage ---------- */
  Promise.all(FILES.map(loadCSV))
    .then((results) => {
      FILES.forEach((f, i) => { D[f] = results[i]; });
      D.textes.forEach((r) => { T[r.cle] = r.texte; });
      render();
      $("#loading").hidden = true;
      scrollSpy();
      $("#pdf-all").addEventListener("click", (e) => exportPDF(null, e.currentTarget));
      document.querySelectorAll(".pdf-one").forEach((b) =>
        b.addEventListener("click", (e) => exportPDF(b.dataset.section, e.currentTarget)));
      window.__dossierReady = true;
    })
    .catch((err) => {
      $("#loading").hidden = true;
      const box = $("#error");
      box.hidden = false;
      box.textContent = "Les données n'ont pas pu être chargées (" + err.message + "). " +
        "Si vous ouvrez le fichier directement depuis votre ordinateur, lancez plutôt un petit serveur local " +
        "(python -m http.server) ou consultez la version publiée sur GitHub Pages.";
    });

  window.__buildDoc = buildDoc;
})();
