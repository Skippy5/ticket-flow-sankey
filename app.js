const samples = {
  enterprise: {
    label: 'Enterprise IT Operations',
    note: 'A broad operational sample showing Service Desk handoffs into infrastructure, app, network, and vendor queues.',
    links: [
      ['Service Desk','Desktop Support',820,'Workplace','P3'], ['Service Desk','Identity & Access',610,'Access','P2'], ['Service Desk','Network Operations',390,'Network','P2'], ['Service Desk','Enterprise Apps',540,'Applications','P3'], ['Service Desk','Cloud Platform',260,'Cloud','P3'], ['Service Desk','Security Operations',185,'Security','P1'],
      ['Desktop Support','Endpoint Engineering',210,'Workplace','P3'], ['Desktop Support','Hardware Vendor',96,'Workplace','P3'], ['Desktop Support','Service Desk',72,'Workplace','P4'],
      ['Identity & Access','IAM Engineering',180,'Access','P2'], ['Identity & Access','HR Systems',88,'Access','P3'], ['Identity & Access','Service Desk',52,'Access','P4'],
      ['Network Operations','Telecom',108,'Network','P3'], ['Network Operations','Firewall Team',92,'Network','P2'], ['Network Operations','Cloud Platform',64,'Network','P3'],
      ['Enterprise Apps','ERP Support',205,'Applications','P2'], ['Enterprise Apps','Database Team',118,'Applications','P3'], ['Enterprise Apps','Vendor Support',84,'Applications','P3'],
      ['Cloud Platform','Database Team',74,'Cloud','P3'], ['Cloud Platform','Security Operations',48,'Cloud','P2'], ['Security Operations','IAM Engineering',58,'Security','P1'], ['Firewall Team','Security Operations',36,'Network','P2']
    ]
  },
  workplace: {
    label: 'Digital Workplace',
    note: 'Focused sample for laptops, collaboration tools, mobile devices, and endpoint services.',
    links: [
      ['Service Desk','Digital Workplace',1200,'Workplace','P3'], ['Service Desk','Identity & Access',430,'Access','P2'], ['Service Desk','Messaging & Collaboration',510,'Collaboration','P3'],
      ['Digital Workplace','Desktop Support',520,'Workplace','P3'], ['Digital Workplace','Endpoint Engineering',330,'Workplace','P3'], ['Digital Workplace','Mobile Support',170,'Mobility','P3'], ['Digital Workplace','Hardware Vendor',120,'Workplace','P4'],
      ['Desktop Support','Endpoint Engineering',190,'Workplace','P3'], ['Desktop Support','Messaging & Collaboration',74,'Collaboration','P4'], ['Desktop Support','Service Desk',95,'Workplace','P4'],
      ['Messaging & Collaboration','Exchange Online',210,'Collaboration','P3'], ['Messaging & Collaboration','Teams Engineering',168,'Collaboration','P3'], ['Messaging & Collaboration','Security Operations',54,'Security','P2'],
      ['Endpoint Engineering','Security Operations',88,'Security','P2'], ['Endpoint Engineering','Software Packaging',144,'Workplace','P3'], ['Mobile Support','Telecom',68,'Mobility','P3'], ['Identity & Access','IAM Engineering',155,'Access','P2']
    ]
  },
  security: {
    label: 'Security & Access',
    note: 'Security-heavy sample emphasizing access, policy, SOC, and firewall escalation paths.',
    links: [
      ['Service Desk','Identity & Access',760,'Access','P2'], ['Service Desk','Security Operations',410,'Security','P1'], ['Service Desk','Network Operations',240,'Network','P2'], ['Service Desk','Desktop Support',300,'Workplace','P3'],
      ['Identity & Access','IAM Engineering',270,'Access','P2'], ['Identity & Access','Privileged Access',160,'Access','P1'], ['Identity & Access','HR Systems',92,'Access','P3'], ['Identity & Access','Service Desk',64,'Access','P4'],
      ['Security Operations','Incident Response',128,'Security','P1'], ['Security Operations','Firewall Team',112,'Security','P2'], ['Security Operations','Endpoint Engineering',95,'Security','P2'], ['Security Operations','IAM Engineering',84,'Security','P2'],
      ['Network Operations','Firewall Team',105,'Network','P2'], ['Firewall Team','Network Operations',45,'Network','P3'], ['Firewall Team','Cloud Security',72,'Security','P2'], ['Incident Response','Legal / Compliance',34,'Security','P1'], ['Endpoint Engineering','Desktop Support',58,'Workplace','P3'], ['Privileged Access','Security Operations',42,'Access','P1']
    ]
  }
};

let currentRows = samples.enterprise.links.map(rowToObject);
let datasetName = samples.enterprise.label;

const colors = d3.scaleOrdinal()
  .domain(['Service Desk','Workplace','Access','Network','Applications','Cloud','Security','Vendor','Other'])
  .range(['#54d6ff','#38d996','#fbbf24','#60a5fa','#c084fc','#22d3ee','#fb7185','#f97316','#94a3b8']);

const els = {
  sampleSelect: document.getElementById('sampleSelect'),
  csvUpload: document.getElementById('csvUpload'),
  minFlow: document.getElementById('minFlow'),
  minFlowLabel: document.getElementById('minFlowLabel'),
  chart: document.getElementById('chart'),
  empty: document.getElementById('emptyState'),
  totalTickets: document.getElementById('totalTickets'),
  teamCount: document.getElementById('teamCount'),
  handoffCount: document.getElementById('handoffCount'),
  topPath: document.getElementById('topPath'),
  reassignmentRate: document.getElementById('reassignmentRate'),
  insights: document.getElementById('insights'),
  datasetNote: document.getElementById('datasetNote'),
  legend: document.getElementById('legend'),
  downloadSvg: document.getElementById('downloadSvg'),
  downloadCsv: document.getElementById('downloadCsv')
};

function rowToObject([source, target, count, category = 'Other', priority = '']) {
  return { source, target, count: Number(count), category, priority };
}

function aggregateRows(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.source || !row.target || !Number.isFinite(Number(row.count))) continue;
    const key = `${row.source}→${row.target}`;
    const existing = map.get(key) || { source: row.source.trim(), target: row.target.trim(), count: 0, category: row.category || 'Other', priority: row.priority || '' };
    existing.count += Number(row.count);
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function graphFromRows(rows, minFlow) {
  const links = aggregateRows(rows).filter(d => d.count >= minFlow);
  const nodeNames = Array.from(new Set(links.flatMap(d => [d.source, d.target])));
  const nodes = nodeNames.map(name => ({ name, category: inferCategory(name, links) }));
  const index = new Map(nodes.map((d, i) => [d.name, i]));
  return {
    nodes,
    links: links.map(d => ({ ...d, source: index.get(d.source), target: index.get(d.target), value: d.count }))
  };
}

function inferCategory(name, links) {
  if (name === 'Service Desk') return 'Service Desk';
  const related = links.find(l => l.source === name || l.target === name);
  if (!related) return 'Other';
  if (/vendor/i.test(name)) return 'Vendor';
  return related.category || 'Other';
}

function render() {
  const minFlow = Number(els.minFlow.value);
  els.minFlowLabel.textContent = minFlow.toLocaleString();
  const rows = aggregateRows(currentRows);
  const graph = graphFromRows(rows, minFlow);
  updateStats(rows, graph);
  updateInsights(rows, graph, minFlow);
  renderLegend(rows);

  els.chart.innerHTML = '';
  els.empty.classList.toggle('hidden', graph.links.length > 0);
  if (!graph.links.length) return;

  const width = Math.max(920, els.chart.clientWidth || 920);
  const height = Math.max(620, Math.min(920, 260 + graph.nodes.length * 30));
  const svg = d3.select(els.chart).append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', width)
    .attr('height', height)
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .style('display', 'block');

  const sankey = d3.sankey()
    .nodeWidth(18)
    .nodePadding(18)
    .nodeAlign(d3.sankeyJustify)
    .extent([[18, 10], [width - 24, height - 20]]);

  const sankeyGraph = sankey({
    nodes: graph.nodes.map(d => ({ ...d })),
    links: graph.links.map(d => ({ ...d }))
  });

  const tooltip = d3.select('body').selectAll('.tooltip').data([null]).join('div').attr('class', 'tooltip');

  svg.append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(sankeyGraph.links)
    .join('path')
    .attr('class', 'link')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', d => colors(d.category || d.source.category || 'Other'))
    .attr('stroke-opacity', 0.42)
    .style('mix-blend-mode', 'normal')
    .attr('stroke-width', d => Math.max(1, d.width))
    .on('mousemove', (event, d) => showTooltip(tooltip, event, `<strong>${d.source.name} → ${d.target.name}</strong><br>${d.value.toLocaleString()} tickets${d.priority ? `<br>Priority: ${d.priority}` : ''}`))
    .on('mouseleave', () => hideTooltip(tooltip))
    .append('title')
    .text(d => `${d.source.name} → ${d.target.name}: ${d.value.toLocaleString()} tickets`);

  const node = svg.append('g')
    .selectAll('g')
    .data(sankeyGraph.nodes)
    .join('g')
    .attr('class', 'node')
    .on('mousemove', (event, d) => showTooltip(tooltip, event, `<strong>${d.name}</strong><br>In: ${d.value.toLocaleString()} tickets<br>Out: ${d3.sum(d.sourceLinks, l => l.value).toLocaleString()} tickets`))
    .on('mouseleave', () => hideTooltip(tooltip));

  node.append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => Math.max(1, d.y1 - d.y0))
    .attr('width', d => d.x1 - d.x0)
    .attr('rx', 4)
    .attr('fill', d => colors(d.category || 'Other'))
    .attr('stroke', 'rgba(255,255,255,0.35)');

  node.append('text')
    .attr('x', d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
    .text(d => `${d.name} (${d.value.toLocaleString()})`);
}

function showTooltip(tooltip, event, html) {
  tooltip.html(html).style('opacity', 1).style('left', `${event.clientX}px`).style('top', `${event.clientY}px`);
}
function hideTooltip(tooltip) { tooltip.style('opacity', 0); }

function updateStats(rows, graph) {
  const total = d3.sum(rows.filter(d => d.source === 'Service Desk'), d => d.count) || d3.sum(rows, d => d.count);
  const uniqueTeams = new Set(rows.flatMap(d => [d.source, d.target]));
  const top = rows[0];
  const nonDesk = d3.sum(rows.filter(d => d.source !== 'Service Desk'), d => d.count);
  const deskOut = d3.sum(rows.filter(d => d.source === 'Service Desk'), d => d.count) || total;
  els.totalTickets.textContent = total.toLocaleString();
  els.teamCount.textContent = uniqueTeams.size.toLocaleString();
  els.handoffCount.textContent = graph.links.length.toLocaleString();
  els.topPath.textContent = top ? `${top.source} → ${top.target}` : '—';
  els.reassignmentRate.textContent = deskOut ? `${Math.round((nonDesk / deskOut) * 100)}%` : '—';
}

function updateInsights(rows, graph, minFlow) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const loops = rows.filter(r => rows.some(o => o.source === r.target && o.target === r.source));
  const serviceDeskBackflow = rows.filter(r => r.target === 'Service Desk');
  const downstream = sorted.filter(r => r.source !== 'Service Desk')[0];
  const hidden = rows.length - graph.links.length;
  const items = [];
  if (sorted[0]) items.push(`<strong>Largest handoff:</strong> ${sorted[0].source} → ${sorted[0].target} carries ${sorted[0].count.toLocaleString()} tickets.`);
  if (downstream) items.push(`<strong>Largest downstream escalation:</strong> ${downstream.source} → ${downstream.target} at ${downstream.count.toLocaleString()} tickets — a good candidate for knowledge, automation, or cleaner routing rules.`);
  if (serviceDeskBackflow.length) items.push(`<strong>Backflow detected:</strong> ${d3.sum(serviceDeskBackflow, d => d.count).toLocaleString()} tickets return to Service Desk from resolver teams. That is queue ping-pong, a sport nobody wins.`);
  if (loops.length) items.push(`<strong>Bidirectional loops:</strong> ${new Set(loops.map(d => [d.source, d.target].sort().join(' ↔ '))).size} team pairs send tickets both ways.`);
  if (hidden > 0) items.push(`<strong>Threshold filter:</strong> ${hidden} low-volume paths are hidden below ${minFlow.toLocaleString()} tickets.`);
  els.insights.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}

function renderLegend(rows) {
  const cats = Array.from(new Set(rows.map(d => d.category || 'Other')));
  els.legend.innerHTML = cats.map(cat => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${colors(cat)};margin-right:6px"></i>${cat}</span>`).join('');
}

function parseCsv(text) {
  const parsed = d3.csvParse(text.trim());
  const required = ['source', 'target', 'count'];
  const columns = parsed.columns.map(c => c.toLowerCase().trim());
  const missing = required.filter(col => !columns.includes(col));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);
  return parsed.map(row => ({
    source: row.source || row.Source,
    target: row.target || row.Target,
    count: Number(row.count || row.Count),
    category: row.category || row.Category || 'Imported',
    priority: row.priority || row.Priority || ''
  }));
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

els.sampleSelect.addEventListener('change', event => {
  const sample = samples[event.target.value];
  currentRows = sample.links.map(rowToObject);
  datasetName = sample.label;
  els.datasetNote.textContent = sample.note;
  els.csvUpload.value = '';
  render();
});

els.csvUpload.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    currentRows = parseCsv(await file.text());
    datasetName = file.name.replace(/\.csv$/i, '');
    els.datasetNote.textContent = `Imported ${file.name}. Duplicate paths are aggregated automatically.`;
    render();
  } catch (error) {
    alert(`CSV import failed: ${error.message}`);
  }
});

els.minFlow.addEventListener('input', render);
window.addEventListener('resize', () => render());

els.downloadSvg.addEventListener('click', () => {
  const svg = els.chart.querySelector('svg');
  if (!svg) return;
  const content = new XMLSerializer().serializeToString(svg);
  download(`${datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sankey.svg`, content, 'image/svg+xml');
});

els.downloadCsv.addEventListener('click', () => {
  const header = 'source,target,count,category,priority';
  const lines = aggregateRows(currentRows).map(r => [r.source, r.target, r.count, r.category || '', r.priority || ''].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','));
  download(`${datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, [header, ...lines].join('\n'), 'text/csv');
});

els.datasetNote.textContent = samples.enterprise.note;
render();
