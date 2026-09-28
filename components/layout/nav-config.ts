export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Users', href: '/admin/users', icon: 'Users' },
  { label: 'Distributors', href: '/admin/distributors', icon: 'Building2' },
  { label: 'Retailers', href: '/admin/retailers', icon: 'Store' },
  { label: 'Services', href: '/admin/services', icon: 'ListTree' },
  { label: 'Categories', href: '/admin/categories', icon: 'Layers' },
  { label: 'Providers', href: '/admin/providers', icon: 'Server' },
  { label: 'Orders', href: '/admin/orders', icon: 'ShoppingCart' },
  { label: 'Wallet', href: '/admin/wallet', icon: 'Wallet' },
  { label: 'Payments', href: '/admin/payments', icon: 'CreditCard' },
  { label: 'Transactions', href: '/admin/transactions', icon: 'Receipt' },
  { label: 'Pricing', href: '/admin/pricing', icon: 'Tags' },
  { label: 'API Management', href: '/admin/api-management', icon: 'KeyRound' },
  { label: 'Tickets', href: '/admin/tickets', icon: 'LifeBuoy' },
  { label: 'Notifications', href: '/admin/notifications', icon: 'Bell' },
  { label: 'Reports', href: '/admin/reports', icon: 'BarChart3' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'ScrollText' },
];

export const distributorNav: NavItem[] = [
  { label: 'Dashboard', href: '/distributor/dashboard', icon: 'LayoutDashboard' },
  { label: 'Retailers', href: '/distributor/retailers', icon: 'Store' },
  { label: 'Services', href: '/distributor/services', icon: 'ListTree' },
  { label: 'Orders', href: '/distributor/orders', icon: 'ShoppingCart' },
  { label: 'Wallet', href: '/distributor/wallet', icon: 'Wallet' },
  { label: 'Transactions', href: '/distributor/transactions', icon: 'Receipt' },
  { label: 'Pricing', href: '/distributor/pricing', icon: 'Tags' },
  { label: 'Reports', href: '/distributor/reports', icon: 'BarChart3' },
  { label: 'API', href: '/distributor/api', icon: 'KeyRound' },
  { label: 'Support', href: '/distributor/support', icon: 'LifeBuoy' },
  { label: 'Profile', href: '/distributor/profile', icon: 'Users' },
];

export const retailerNav: NavItem[] = [
  { label: 'Dashboard', href: '/retailer/dashboard', icon: 'LayoutDashboard' },
  { label: 'Services', href: '/retailer/services', icon: 'ListTree' },
  { label: 'New Order', href: '/retailer/new-order', icon: 'PlusCircle' },
  { label: 'My Orders', href: '/retailer/orders', icon: 'ShoppingCart' },
  { label: 'Wallet', href: '/retailer/wallet', icon: 'Wallet' },
  { label: 'Transactions', href: '/retailer/transactions', icon: 'Receipt' },
  { label: 'API', href: '/retailer/api', icon: 'KeyRound' },
  { label: 'Tickets', href: '/retailer/tickets', icon: 'LifeBuoy' },
  { label: 'Profile', href: '/retailer/profile', icon: 'Users' },
];