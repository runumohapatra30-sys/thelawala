const MAP: Array<[RegExp, string]> = [
  [/dahi|bara|vada/i, "/food/food-dahibara.jpg"],
  [/roll|kathi|frankie|wrap/i, "/food/food-roll.jpg"],
  [/chaat|gupchup|panipuri|pani puri|bhel|dahi puri/i, "/food/food-chaat.jpg"],
  [/chai|tea|coffee|drink|juice|lassi/i, "/food/food-chai.jpg"],
  [/pakod|pakhal|fry|chop|cutlet|chicken/i, "/food/food-pakoda.jpg"],
  [/sweet|mitha|rasgulla|rasagola|misthi|dessert/i, "/food/food-sweets.jpg"],
  [/chhena|chena|poda|cake/i, "/food/food-chhenapoda.jpg"],
  [/momo|dumpling/i, "/food/food-momo.jpg"],
  [/biryani|biriyani|pulao|fried rice|noodle|chowmein/i, "/food/food-biryani.jpg"],
  [/bhata|dali|thali|rice|meal|curry|lunch|dinner/i, "/food/food-thali.jpg"],
  [/tiffin|idli|dosa|upma|breakfast|chuda|snack/i, "/food/food-tiffin.jpg"],
];

/** Best-matching realistic food photo for a category or item name. */
export function foodImage(name?: string | null, fallback = "/food/food-tiffin.jpg") {
  if (!name) return fallback;
  for (const [re, src] of MAP) if (re.test(name)) return src;
  return fallback;
}
