const seabreezeDefaultContent = [
  {
    sectionKey: 'location',
    title: 'Sea Breeze harada yerləşir?',
    content: 'Sea Breeze Xəzər dənizinin sahilində yerləşən premium kurort şəhərciyidir.\n\nBöyükşor–Pirşağı avtomobil yolunun istifadəyə verilməsi nəticəsində hava limanından Sea Breeze-ə yol təxminən 22 dəqiqəyə qədər qısalmışdır.\n\nAtəşgah məbədi 25 km, Heydər Əliyev Mərkəzi isə 42 km məsafədə yerləşir.',
  },
  {
    sectionKey: 'today',
    title: 'Sea Breeze bu gün',
    content: 'Sea Breeze 2006-cı ildə təsis olunub.\n\nBu gün ərazi 750 hektardan çox sahəni əhatə edir və burada 50 mindən çox sakin yaşayır.\n\nKurort şəhərciyi yaşayış, kommersiya, istirahət və əyləncə infrastrukturlarını özündə birləşdirir.',
    facts: ['750 ha ərazi', '50000+ sakin', '3.5 mln m² yaşayış və kommersiya sahəsi', '300 ha yaşıllıq'],
  },
  { sectionKey: 'stats', title: 'Sea Breeze rəqəmlərlə', facts: ['750 ha ərazi', '11 mln+ ağac və kol', '50+ restoran və bar', '7500+ işçi', '7 km çimərlik', '60+ hovuz', '50000+ sakin', '50+ daşınmaz əmlak layihəsi'] },
  { sectionKey: 'kids', title: 'Uşaqlar üçün hər şey', content: 'Sea Breeze uşaqların rahatlığı və inkişafı üçün geniş imkanlar təqdim edir.\n\nƏyləncə zonaları, təhsil müəssisələri və ailə yönümlü infrastruktur burada həyat keyfiyyətini yüksəldir.' },
  { sectionKey: 'education', title: 'Təhsil imkanları', content: 'LANDAU School və LANDAU Kindergarten beynəlxalq standartlara uyğun təhsil imkanları təqdim edir.\n\nTədris əsasən ingilis dilində həyata keçirilir.' },
  { sectionKey: 'investment', title: 'Sea Breeze-ə yatırım', content: 'Sea Breeze həm yaşayış, həm də investisiya baxımından ölkənin ən perspektivli layihələrindən biridir.\n\nƏmlakın idarə olunması, kirayə koordinasiyası və servis xidmətləri təqdim olunur.' },
  { sectionKey: 'investor-benefits', title: 'İnvestorlar niyə Sea Breeze seçirlər?', facts: ['15-35% orta illik dəyər artımı', '8% passiv kirayə gəliri', '40 m² - 1500 m² seçimlər', 'Azərbaycan bazarında unikal layihə', 'Turizm sektorunda mühüm rol', 'Xüsusi investor paketləri'] },
  { sectionKey: 'growth', title: 'Satış dinamikası', content: 'Tikinti başlanğıcından etibarən layihələrin qiyməti orta hesabla ildə 15-35% artır.\n\nTəkrar bazarda qiymətlər ilkin qiymətlərdən 70-90% yüksək ola bilir.' },
  { sectionKey: 'beach-club', title: 'Dəniz sahilində unudulmaz tətil', content: 'Sea Breeze Beach Club sakinlər və qonaqlar üçün özəl çimərlik klubudur.\n\n7 km-dən çox sahil xətti boyunca hovuzlar, restoranlar, barlar və istirahət zonaları fəaliyyət göstərir.' },
  { sectionKey: 'nightlife', title: 'Çimərlik klubları və əyləncə', content: 'Nikki Beach, Maize Beach və Roberto Beach Club yay mövsümünün əsas əyləncə məkanlarıdır.' },
  { sectionKey: 'restaurants', title: 'Restaurants by Emin Agalarov', facts: ['Park Cafe', 'Fish Box', 'Shore House', 'Beach Club', 'Bosfor'] },
  { sectionKey: 'food-court', title: 'Food Court və Delivery', content: 'Sea Breeze Delivery xidməti restoran və kafelərdən sifarişlərin birbaşa sakinlərə çatdırılmasını təmin edir.' },
  { sectionKey: 'event-hall', title: 'Event Hall', content: '1300 m² sahəyə malik Event Hall toylar, konfranslar və böyük tədbirlər üçün nəzərdə tutulub.' },
  { sectionKey: 'venetian-harbour', title: 'Venetian Harbour', content: 'Premium butiklər, restoranlar və panoramik müşahidə qülləsi ilə Sea Breeze-in əsas mərkəzlərindən biri olacaq.' },
  { sectionKey: 'nikki-beach', title: 'Nikki Beach', content: 'Dünyanın ən məşhur çimərlik klublarından biri olan Nikki Beach Sea Breeze ərazisində fəaliyyət göstərir.' },
  { sectionKey: 'cta', title: 'Sea Breeze-in bir hissəsinə çevrilin', content: 'Premium yaşayış, investisiya və istirahət imkanlarını bir arada kəşf edin.' },
];

module.exports = seabreezeDefaultContent.map((section, index) => ({
  content: '',
  facts: [],
  sortOrder: index + 1,
  isActive: true,
  ...section,
}));
