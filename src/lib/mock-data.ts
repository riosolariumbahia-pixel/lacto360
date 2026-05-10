export const weeklyProduction = [
  { day: "Seg", kg: 185, lucro: 1420, rendimento: 51.2 },
  { day: "Ter", kg: 210, lucro: 1680, rendimento: 52.1 },
  { day: "Qua", kg: 198, lucro: 1540, rendimento: 50.8 },
  { day: "Qui", kg: 230, lucro: 1890, rendimento: 53.4 },
  { day: "Sex", kg: 215, lucro: 1750, rendimento: 52.6 },
  { day: "Sáb", kg: 245, lucro: 2100, rendimento: 53.9 },
  { day: "Dom", kg: 248, lucro: 2150, rendimento: 54.1 },
];

export const monthlyFinance = [
  { mes: "Jan", receita: 28000, despesa: 18000, lucro: 10000 },
  { mes: "Fev", receita: 31000, despesa: 19500, lucro: 11500 },
  { mes: "Mar", receita: 29000, despesa: 17000, lucro: 12000 },
  { mes: "Abr", receita: 35000, despesa: 20000, lucro: 15000 },
  { mes: "Mai", receita: 42000, despesa: 22000, lucro: 20000 },
  { mes: "Jun", receita: 39000, despesa: 21000, lucro: 18000 },
  { mes: "Jul", receita: 44000, despesa: 23000, lucro: 21000 },
  { mes: "Ago", receita: 47000, despesa: 24000, lucro: 23000 },
];

export const salesByChannel = [
  { name: "Supermercados", value: 45 },
  { name: "Padarias", value: 28 },
  { name: "Distribuidores", value: 18 },
  { name: "Varejo Direto", value: 9 },
];

export const stockItems = [
  { item: "Leite cru", qty: 4200, unit: "L", min: 2000, status: "ok" as const },
  { item: "Creme de leite", qty: 180, unit: "kg", min: 200, status: "warning" as const },
  { item: "Sal refinado", qty: 95, unit: "kg", min: 50, status: "ok" as const },
  { item: "Manteiga pronta", qty: 320, unit: "kg", min: 150, status: "ok" as const },
  { item: "Embalagem 200g", qty: 120, unit: "un", min: 500, status: "critical" as const },
  { item: "Embalagem 500g", qty: 840, unit: "un", min: 300, status: "ok" as const },
];

export const lotes = [
  { id: "L-2026-089", data: "09/05/2026", leite: 400, creme: 120, sal: 4.5, kg: 210, rendimento: 52.5, custoKg: 18.4, precoKg: 32.0, margem: 73.9, status: "Concluído" as const },
  { id: "L-2026-088", data: "08/05/2026", leite: 380, creme: 110, sal: 4.2, kg: 197, rendimento: 51.8, custoKg: 17.9, precoKg: 32.0, margem: 78.8, status: "Concluído" as const },
  { id: "L-2026-087", data: "07/05/2026", leite: 420, creme: 125, sal: 4.8, kg: 223, rendimento: 53.1, custoKg: 18.7, precoKg: 32.0, margem: 71.1, status: "Concluído" as const },
  { id: "L-2026-090", data: "10/05/2026", leite: 200, creme: 60, sal: 2.2, kg: 0, rendimento: 0, custoKg: 0, precoKg: 32.0, margem: 0, status: "Em andamento" as const },
];

export const topClients = [
  { name: "Supermercado BomPreço", value: 8400, orders: 12, status: "Ativo" as const, meta: 92 },
  { name: "Padaria Central", value: 3200, orders: 8, status: "Ativo" as const, meta: 64 },
  { name: "Distribuidora Norte", value: 5800, orders: 5, status: "Ativo" as const, meta: 78 },
  { name: "Mercearia do João", value: 1200, orders: 3, status: "Inadimplente" as const, meta: 24 },
  { name: "Empório Vale Verde", value: 4400, orders: 7, status: "Ativo" as const, meta: 71 },
];

export const recentOrders = [
  { id: "#PD-1042", cliente: "Supermercado BomPreço", kg: 80, total: 2560, status: "Entregue" as const, data: "Hoje" },
  { id: "#PD-1041", cliente: "Padaria Central", kg: 25, total: 800, status: "Em rota" as const, data: "Hoje" },
  { id: "#PD-1040", cliente: "Distribuidora Norte", kg: 120, total: 3840, status: "Pendente" as const, data: "Ontem" },
  { id: "#PD-1039", cliente: "Empório Vale Verde", kg: 40, total: 1280, status: "Entregue" as const, data: "Ontem" },
];

export const aiInsights = [
  { id: 1, icon: "trend", title: "Produção em alta", text: "Sua produção cresceu 12% esta semana. Continue no ritmo para bater a meta mensal.", tone: "success" as const },
  { id: 2, icon: "alert", title: "Estoque crítico", text: "Embalagens de 200g abaixo do mínimo. Faça reposição em até 48h para evitar parada.", tone: "warning" as const },
  { id: 3, icon: "users", title: "Cliente em risco", text: "Mercearia do João está há 12 dias sem pedido. Hora de uma ligação rápida.", tone: "info" as const },
  { id: 4, icon: "target", title: "Meta no caminho", text: "Você atingiu 87% da meta de faturamento de Maio.", tone: "success" as const },
];

export const notifications = [
  { id: 1, title: "Embalagem 200g abaixo do mínimo", time: "há 5 min", tone: "warning" as const },
  { id: 2, title: "Pedido #PD-1042 entregue", time: "há 1 h", tone: "success" as const },
  { id: 3, title: "Lote L-2026-090 em andamento", time: "há 2 h", tone: "info" as const },
  { id: 4, title: "Mercearia do João sem compras há 12 dias", time: "ontem", tone: "info" as const },
];

export const kpis = {
  faturamentoMes: 47230,
  faturamentoDelta: 12.4,
  manteigaKg: 1531,
  manteigaDelta: 8.1,
  lucroMes: 23120,
  lucroDelta: 18.6,
  rendimentoMedio: 52.6,
  rendimentoDelta: 1.2,
  ticketMedio: 1840,
  pedidosMes: 42,
  perdas: 3.2,
  clientes: 38,
};

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const fmtNum = (n: number) => n.toLocaleString("pt-BR");
