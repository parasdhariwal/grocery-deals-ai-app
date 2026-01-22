
import { Offer, Purchase } from '../types';

const generateOffers = (): Offer[] => {
  const departments = [
    "Produce", "Dairy", "Meat & Seafood", "Bakery", "Deli", "Pantry", "Frozen", "Beverages", "Snacks", "Household"
  ];

  const itemsByDept: Record<string, string[]> = {
    "Produce": ["Fresh Strawberries", "Organic Baby Spinach", "Bell Peppers Trio"],
    "Dairy": ["Oat Milk (Creamy)", "Shredded Cheddar Cheese", "Large Grade A Eggs"],
    "Meat & Seafood": ["Ribeye Steak", "Jumbo Raw Shrimp", "Pork Loin Chops"],
    "Bakery": ["Blueberry Muffins", "Whole Wheat Loaf", "Glazed Donuts"],
    "Deli": ["Premium Roast Beef", "Creamy Potato Salad", "Sliced Swiss Cheese"],
    "Pantry": ["Peanut Butter (Smooth)", "Jasmine Rice (5lb)", "Wildflower Honey"],
    "Frozen": ["Mixed Berry Blend", "Breaded Chicken Nuggets", "Thin Crust Pizza"],
    "Beverages": ["Almond Milk (Unsweetened)", "Cold Brew Coffee", "100% Orange Juice"],
    "Snacks": ["Tortilla Chips", "Chewy Granola Bars", "Sea Salt Popcorn"],
    "Household": ["Recycled Paper Plates", "Heavy Duty Trash Bags", "Streak-Free Glass Cleaner"]
  };

  const itemImageIds: Record<string, string[]> = {
    "Produce": ["1464961430262-db30fd54e258", "1540441656598-c146834d9ed3", "1523049673857-eb18f9708f42"],
    "Dairy": ["1550583724-7fa0316a92ef", "1486297678162-eb50c9b463ba", "1582456780303-9646f217bb9c"],
    "Meat & Seafood": ["1544077960-601f28bf736c", "1559742811-a5301e4c01d2", "1602497514717-3286a6955361"],
    "Bakery": ["1558961363-fa5fba4fd854", "1509440159596-0249088772ff", "1555507036-311e195762ce"],
    "Deli": ["1598103442097-8b74394b95c6", "1585822310625-5f80e9279595", "1602163013146-24b9c1d9326d"],
    "Pantry": ["1568901346375-23c9450c58cd", "1586201375745-16056a076d34", "1587131745749-bbd3c0155a0b"],
    "Frozen": ["1601004869309-a447c24452aa", "1562440496-ec619b89a5ad", "1513104894672-d4e83f218aef"],
    "Beverages": ["1505503204996-852136060191", "1554867813-2956c2e33d47", "1613478223719-7835aba7d3b1"],
    "Snacks": ["1566478982333-d7fa197bf474", "1541544336-7c126bdcd041", "1585559605206-d8c8c3297a14"],
    "Household": ["1584622781564-1d9876a13d00", "1584622650299-b1d35504300d", "1582727307738-9cb5c18163c4"]
  };

  const prices = [
    "$1.99", "$3.49", "$4.99", "2 for $5", "Buy 1 Get 1 Free", 
    "$6.99", "$1.25", "$8.99", "3 for $10", "$5.50"
  ];
  
  const offers: Offer[] = [];
  const today = new Date();

  departments.forEach((deptName, deptIdx) => {
    itemsByDept[deptName].forEach((item, itemIdx) => {
      const expiryDate = new Date();
      // Distribute expiry dates for variety (some today, some soon, some next week)
      if (itemIdx === 0) {
        expiryDate.setDate(today.getDate() + 1); // Tomorrow
      } else if (itemIdx === 1) {
        expiryDate.setDate(today.getDate() + 4); // 4 days away
      } else {
        expiryDate.setDate(today.getDate() + 8); // Next week
      }

      const imageId = itemImageIds[deptName][itemIdx];
      const id = `${deptIdx}-${itemIdx}`;
      const basePriceIndex = (deptIdx + itemIdx) % prices.length;
      
      offers.push({
        id,
        merchant: "Fresh Market",
        category: deptName,
        deal: `${item}.`,
        price: prices[basePriceIndex],
        originalPrice: `$${(parseFloat(prices[basePriceIndex].replace(/[^0-9.]/g, '')) || 4.99 + 1.5).toFixed(2)}`,
        description: `Premium quality ${item.toLowerCase()} from local suppliers. Freshness guaranteed at Fresh Market. Perfect for your weekly grocery needs.`,
        expiry: expiryDate.toISOString().split('T')[0],
        usageInfo: itemIdx % 2 === 0 ? "Limit 3 per transaction." : "While supplies last. See store for details.",
        image: `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&q=80&w=400`,
        clipped: false
      });
    });
  });

  return offers;
};

const MOCK_OFFERS: Offer[] = generateOffers();

const MOCK_PURCHASES: Purchase[] = [
  {
    id: "p1",
    item: "Fresh Strawberries",
    merchant: "Fresh Market",
    date: "2025-05-08",
    price: "$2.50",
    category: "Produce"
  },
  {
    id: "p2",
    item: "Almond Milk",
    merchant: "Fresh Market",
    date: "2025-05-12",
    price: "$3.49",
    category: "Beverages"
  },
  {
    id: "p3",
    item: "Whole Wheat Loaf",
    merchant: "Fresh Market",
    date: "2025-05-15",
    price: "$3.99",
    category: "Bakery"
  }
];

export const mockApiService = {
  getOffers: async (): Promise<Offer[]> => {
    // Realistic delay for API feel
    await new Promise(resolve => setTimeout(resolve, 800));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return MOCK_OFFERS.filter(offer => new Date(offer.expiry) >= now);
  },

  getPurchases: async (): Promise<Purchase[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return [...MOCK_PURCHASES];
  },

  clipOffer: async (offerId: string): Promise<{ status: string; message: string }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      status: "success",
      message: "Offer clipped to your list!"
    };
  },

  unclipOffer: async (offerId: string): Promise<{ status: string; message: string }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      status: "success",
      message: "Offer removed from your list!"
    };
  }
};
