import React, { useState, useMemo } from 'react';
import { BookOpen, Flame, Clock, Thermometer, Sparkles, Search, CheckCircle2, Shield, Utensils } from 'lucide-react';
import { useKitchen } from '../../context/KitchenContext';

const DEFAULT_RECIPES = [
  {
    id: 'sichuan-hotpot',
    name: 'Sichuan Spicy Hotpot',
    category: 'hotpot',
    prepTime: '12 min prep',
    temperature: 'Target Broth Temp: 92°C before sealing container',
    tempBadge: '🔥 92°C Broth',
    badgeTone: 'border-red-500/40 text-red-400 bg-red-950/60',
    description: 'Simmer rich bone broth with fermented chili paste, Sichuan peppercorns, and star anise. Box fresh sliced beef, enoki mushrooms, and lotus root separately in chilled container.',
    instructions: [
      'Heat Sichuan peppercorns & garlic in chili oil until fragrant (45s).',
      'Add master bone broth base; bring to rolling boil at 98°C.',
      'Ladle 850ml into thermal leak-proof hotpot bucket; verify temp > 92°C.',
      'Pack protein, greens, and dipping sauces (sesame, crushed garlic) in separate compartmentalized bento.'
    ],
    qualitySeal: '🔥 Double-vented lid seal with heat-retaining outer insulation pouch.'
  },
  {
    id: 'herbal-hotpot',
    name: 'Herbal Mushroom Hotpot',
    category: 'hotpot',
    prepTime: '10 min prep',
    temperature: 'Target Broth Temp: 88°C before packaging',
    tempBadge: '🌿 88°C Broth',
    badgeTone: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/60',
    description: 'Vegetarian supreme broth steeped with wild shiitake, porcini essence, goji berries, and fresh ginger roots. Include tofu puffs and bok choy pack.',
    instructions: [
      'Infuse vegetable essence broth with dried shiitake caps and wolfberry for 6 mins.',
      'Strain herbs and season with sea salt and cold-pressed sesame drizzle.',
      'Check soup transparency; fill thermal container to 800ml mark.',
      'Seal with green 100% Plant-Based station seal label.'
    ],
    qualitySeal: '🌿 100% Plant-Based station seal. Clean allergen isolation.'
  },
  {
    id: 'bbq-pizza',
    name: 'Gourmet BBQ Chicken Pizza',
    category: 'pizza',
    prepTime: '8 min bake',
    temperature: 'Stone Oven Temp: 320°C (Rotate at 4 min)',
    tempBadge: '🍕 320°C Oven',
    badgeTone: 'border-orange-500/40 text-orange-400 bg-orange-950/60',
    description: 'Hand-stretch artisan dough to 12 inches. Spread smokey BBQ sauce, whole-milk mozzarella, red onions, and marinated grilled chicken chunks. Bake at 320°C until blistered crust.',
    instructions: [
      'Proof artisan dough ball; stretch uniformly to 12" diameter on semolina board.',
      'Apply 75g artisan smokey BBQ sauce in spiral from center.',
      'Evenly distribute 130g whole-milk shredded mozzarella & 110g grilled chicken chunks.',
      'Slide onto deck at 320°C. Rotate 180° at 4-minute mark. Cut into 8 equal slices.'
    ],
    qualitySeal: '🍕 Steam-vented corrugated pizza box with parchment paper liner.'
  },
  {
    id: 'truffle-beef',
    name: 'Truffle Wagyu Hotpot',
    category: 'hotpot',
    prepTime: '14 min prep',
    temperature: 'Target Broth Temp: 90°C',
    tempBadge: '✨ 90°C Broth',
    badgeTone: 'border-amber-500/40 text-amber-400 bg-amber-950/60',
    description: 'Velvety beef marrow broth infused with black summer truffle oil. Hand-shaved marble score 7+ beef slices placed over cracked ice bed in prep tray.',
    instructions: [
      'Simmer prime beef bone reduction with roasted marrow and leek bundle.',
      'Whisk in 8ml black summer truffle reduction off direct flame.',
      'Pack delicate shaved beef ribbons in dry container layered with parchment.',
      'Enclose golden dining instructions card for optimal 8-second broth swish.'
    ],
    qualitySeal: '✨ Premium Gold Kitchen Seal with thermal preservation sleeve.'
  },
  {
    id: 'margherita-pizza',
    name: 'Classic Margherita Classico',
    category: 'pizza',
    prepTime: '7 min bake',
    temperature: 'Stone Oven Temp: 330°C',
    tempBadge: '🍅 330°C Oven',
    badgeTone: 'border-rose-500/40 text-rose-400 bg-rose-950/60',
    description: 'San Marzano crushed tomato sauce, fior di latte mozzarella, fresh torn basil leaves, and extra virgin olive oil on blistered sourdough crust.',
    instructions: [
      'Stretch 280g slow-fermented dough to thin classic Roman profile.',
      'Spread 80g crushed San Marzano DOP tomatoes and pinch of Mediterranean sea salt.',
      'Scatter fresh fior di latte pearls across surface.',
      'Bake for 7 mins; finish with fresh fresh basil leaves and EVOO drizzle post-oven.'
    ],
    qualitySeal: '🌿 Fresh basil garnish applied post-bake; box immediately.'
  },
  {
    id: 'crispy-wings',
    name: 'Kigali Peri-Peri Crispy Wings',
    category: 'sides',
    prepTime: '9 min fry',
    temperature: 'Fryer Temp: 175°C',
    tempBadge: '🍗 175°C Fryer',
    badgeTone: 'border-yellow-500/40 text-yellow-400 bg-yellow-950/60',
    description: 'Double-fried jumbo wings tossed in fiery house peri-peri honey glaze with pickled daikon and garlic ranch cup.',
    instructions: [
      'Initial fry at 160°C for 6 mins to cook bone-in meat through.',
      'Rest on wire rack for 2 mins to expel surface moisture.',
      'Flash-fry at 175°C for 2.5 mins until deep golden and shatter-crisp.',
      'Toss immediately in warmed peri-peri glaze; pack with steam vents open.'
    ],
    qualitySeal: '⚡ Vented grease-proof pouch to preserve extreme crunch during transit.'
  }
];

export default function KitchenRecipes() {
  useKitchen(); // keep provider connection for future use
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filteredRecipes = useMemo(() => {
    let list = DEFAULT_RECIPES;
    if (selectedCategory !== 'all') {
      list = list.filter(r => r.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.temperature.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, search]);

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-3 sm:p-5 space-y-4 font-sans">
      <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              Recipes
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Simple steps, heat and time for each dish.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
              {DEFAULT_RECIPES.length} recipes
            </span>
          </div>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'hotpot', label: 'Hotpot' },
              { id: 'pizza', label: 'Pizza' },
              { id: 'sides', label: 'Sides' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                  selectedCategory === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                    : 'bg-black/30 border-white/10 text-text-muted hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
          {filteredRecipes.map(recipe => (
            <div
              key={recipe.id}
              className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3.5 shadow-md group"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors">
                    {recipe.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-bold shrink-0 ${recipe.badgeTone}`}>
                    {recipe.tempBadge}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-300">{recipe.prepTime}</span>
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  {recipe.description}
                </p>

                {/* Steps */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                    Steps:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {recipe.instructions.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Quality Seal */}
              <div className="text-[11px] text-amber-200 font-bold bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{recipe.qualitySeal}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
