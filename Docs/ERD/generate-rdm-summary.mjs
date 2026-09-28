import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const root = 'server/prisma/schema';
const schema = readdirSync(root).filter(file => file.endsWith('.prisma'))
  .map(file => readFileSync(`${root}/${file}`, 'utf8')).join('\n');
const blocks = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
const names = new Set(blocks.map(match => match[1]));
const essentials = {
  Faculty: ['code', 'name'], Major: ['code', 'name'], Class: ['code', 'name'],
  User: ['email', 'name', 'status'], Student: ['studentCode'],
  Role: ['name'], Permission: ['permission'],
  OrganizingUnit: ['type', 'code', 'name'], Criteria: ['title', 'maxPoints', 'defaultPoints'],
  Semester: ['year', 'type'],
  Event: ['name', 'location', 'timeStart', 'timeEnd', 'points', 'checkInMode', 'capacity', 'registrationStart', 'registrationEnd'],
  EventRegistration: ['status', 'registeredAt', 'cancelledAt'],
  AttendanceSession: ['direction', 'status', 'radiusMeters'],
  AttendanceScanRequest: ['direction', 'source', 'status', 'requestedStatus', 'rejectionReason'],
  AttendanceRecord: ['direction', 'status', 'timeChecking', 'pointsEarned'],
  ConductScore: ['totalScore', 'ranking', 'status'],
  ConductScoreEntry: ['points', 'result', 'source', 'reason', 'idempotencyKey'],
  ConductScoreCriterionTotal: ['rawScore', 'cappedScore'],
  ConductScoreStatusHistory: ['action', 'reason'],
  ClassSession: ['name', 'startTime', 'endTime'], Schedule: ['dayOfWeek'], FreeTime: ['dayOfWeek'],
  Notification: ['title'], OutboxEvent: ['aggregateType', 'aggregateId', 'eventType', 'publishedAt'],
};
const models = blocks.map(([, name, body]) => {
  const primary = (body.match(/@@id\(\[([^\]]+)\]/)?.[1] ?? '').split(',').map(value => value.trim());
  const uniques = [...body.matchAll(/@@unique\(\[([^\]]+)\]/g)].map(match => match[1].split(',').map(value => value.trim()));
  const fields = [];
  const relations = [];
  for (const line of body.split('\n')) {
    const match = line.trim().match(/^(\w+)\s+(\w+)(\?|\[\])?\s*(.*)$/);
    if (!match) continue;
    const [, field, type, suffix, attributes] = match;
    if (names.has(type)) {
      const relation = attributes.match(/fields:\s*\[([^\]]+)\],\s*references:\s*\[([^\]]+)\]/);
      if (relation) relations.push({ field: relation[1].trim(), target: type, reference: relation[2].trim() });
    } else fields.push({ name: field, type, nullable: suffix === '?', pk: /@id\b/.test(attributes) || primary.includes(field), unique: /@unique\b/.test(attributes) });
  }
  const selected = fields.filter(field => field.pk || relations.some(relation => relation.field === field.name) || (essentials[name] ?? []).includes(field.name) || uniques.some(tuple => tuple.includes(field.name)));
  return { name, table: body.match(/@@map\("([^"]+)"\)/)?.[1] ?? name, fields: selected, omitted: fields.filter(field => !selected.includes(field)).map(field => field.name), relations, uniques };
});
const lookup = new Map(models.map(model => [model.name, model]));
const rows = [
  ['Permission', 'RolePermission', 'Role', 'UserRole'],
  ['Faculty', 'Major', 'User', 'Student'],
  ['Class', 'OrganizingUnit', 'Schedule', 'FreeTime'],
  ['Criteria', 'Event', 'EventRegistration', 'ClassSession'],
  ['Semester', 'AttendanceSession', 'AttendanceScanRequest', 'Notification'],
  ['ConductScoreCriterionTotal', 'ConductScore', 'AttendanceRecord', 'OutboxEvent'],
  ['ConductScoreEntry', 'ConductScoreStatusHistory'],
];
if (new Set(rows.flat()).size !== models.length || rows.flat().some(name => !lookup.has(name))) throw Error('Layout must contain every table exactly once');
// Give every incoming FK a separate landing point inside the referenced key row.
// This is one key row with multiple ports, not duplicate database columns.
for (const model of models) {
  for (const field of model.fields) field.incoming = [];
}
for (const model of models) for (const relation of model.relations) {
  const field = lookup.get(relation.target).fields.find(item => item.name === relation.reference);
  field.incoming.push(`${model.name}.${relation.field}`);
}
const width = 3800;
const cardWidth = 440;
const fieldHeight = 30;
const rowSize = field => Math.max(fieldHeight, field.incoming.length * 22 + 12);
const offset = (model, index) => model.fields.slice(0, index).reduce((sum, field) => sum + rowSize(field), 0);
let y = 550;
rows.forEach((row, rowIndex) => {
  row.forEach((name, column) => {
    const model = lookup.get(name);
    Object.assign(model, { x: 480 + column * 940, y, column, rowIndex, height: 48 + offset(model, model.fields.length) + model.uniques.length * 20 + 20 });
  });
  y += Math.max(...row.map(name => lookup.get(name).height)) + 440;
});
const height = y - 370;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, attributes = '') => `<text x="${x}" y="${y}" ${attributes}>${escape(value)}</text>`;
const edges = [];
const portLabels = [];
const rowLanes = new Map();
const laneCounts = new Map();
const lane = column => {
  const next = (laneCounts.get(column) ?? 0) + 1;
  laneCounts.set(column, next);
  return next;
};
const rendered = new Set();
for (const model of models) for (const relation of model.relations) {
  const target = lookup.get(relation.target);
  const sourceIndex = model.fields.findIndex(field => field.name === relation.field);
  const targetIndex = target.fields.findIndex(field => field.name === relation.reference);
  if (sourceIndex < 0 || targetIndex < 0) throw Error('Missing FK or referenced column');
  const id = `F${String(edges.length + 1).padStart(2, '0')}`;
  model.fields[sourceIndex].fk = id;
  model.fields[sourceIndex].destination = `${target.table}.${relation.reference}`;
  const a = model.x - 65 - lane(model.column) * 10;
  const b = target.x - 65 - lane(target.column) * 10;
  const topRow = Math.min(model.rowIndex, target.rowIndex);
  const channelNumber = (rowLanes.get(topRow) ?? 0) + 1;
  rowLanes.set(topRow, channelNumber);
  const channel = Math.min(model.y, target.y) - 32 - channelNumber * 16;
  const fromY = model.y + 48 + offset(model, sourceIndex) + rowSize(model.fields[sourceIndex]) / 2;
  const destination = target.fields[targetIndex];
  const portIndex = destination.incoming.indexOf(`${model.name}.${relation.field}`);
  const toY = target.y + 48 + offset(target, targetIndex) + 12 + portIndex * 22;
  portLabels.push(text(target.x + 5, toY + 4, id, 'class="port"'));
  const path = `M${model.x},${fromY} H${a} V${channel} H${b} V${toY} H${target.x}`;
  edges.push(`<g class="edge"><title>${id}: ${model.table}.${relation.field} → ${target.table}.${relation.reference}</title><path class="bridge" d="${path}"/><path class="wire" d="${path}" marker-end="url(#arrow)"/>${text(model.x-12,fromY-6,id,'text-anchor="end" class="edge-label"')}</g>`);
  rendered.add(`${model.name}.${relation.field}`);
}
const expected = [...schema.matchAll(/fields:\s*\[/g)].length;
if (edges.length !== expected || rendered.size !== expected) throw Error('Foreign-key coverage mismatch');
const cards = models.map(model => {
  const { x, y } = model;
  const fields = model.fields.map((field, index) => {
    const top = y + 48 + offset(model, index);
    const size = rowSize(field);
    const baseline = top + size / 2 + 5;
    const flags = [field.pk ? 'PK' : '', field.fk ? 'FK' : '', field.unique ? 'U' : ''].filter(Boolean).join(' ');
    return `<g><title>${escape(`${field.name}: ${field.type}${field.nullable ? ' NULL' : ' NOT NULL'}${field.destination ? `; ${field.fk} → ${field.destination}` : ''}`)}</title><rect x="${x+1}" y="${top}" width="${cardWidth-2}" height="${size}" fill="${field.pk ? '#e9f0fc' : index % 2 ? '#f5f7fb' : '#fff'}"/>${text(x+50,baseline,flags,'class="flags"')}${text(x+130,baseline,field.name+(field.nullable?'?':''),field.pk?'font-weight="700"':'')}${text(x+cardWidth-9,baseline,field.fk??'','text-anchor="end" class="reference"')}</g>`;
  }).join('\n');
  const uniques = model.uniques.map((tuple,index) => text(x+8,y+48+offset(model,model.fields.length)+15+index*20,`U${index+1}: (${tuple.join(', ')})`,'class="constraint"')).join('\n');
  return `<g id="${model.name}"><rect x="${x}" y="${y}" width="${cardWidth}" height="${model.height}" rx="5" fill="white" stroke="#a9bbd2"/><rect x="${x}" y="${y}" width="${cardWidth}" height="48" rx="5" fill="#154a9b"/>${text(x+10,y+21,model.table,'class="table"')}${text(x+10,y+39,model.name,'class="model"')}${fields}${uniques}${text(x+8,y+model.height-5,model.omitted.length?`+ ${model.omitted.length} secondary fields omitted`:'','class="omitted"')}</g>`;
}).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>TDTU — Relational Data Model (essential attributes)</title><defs><marker id="arrow" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#5578a8"/></marker></defs><style>text{font-family:Arial,sans-serif;font-size:15px;fill:#173454}.table{font-size:16px;fill:white;font-weight:700}.model{font-size:11px;fill:#e0eaff}.flags{font-size:10px;fill:#154a9b;font-weight:700}.reference,.constraint{font-size:10px;fill:#58708d}.port{font-size:11px;fill:#154a9b}.edge-label{font-size:11px;fill:#154a9b;paint-order:stroke;stroke:white;stroke-width:4}.omitted{font-size:9px;fill:#8793a4}.edge path{fill:none}.bridge{stroke:white;stroke-width:4}.wire{stroke:#476b99;stroke-width:1.6;opacity:1}.edge:hover .wire{stroke:#e68a15;stroke-width:3;opacity:1}</style><rect width="100%" height="100%" fill="white"/>${text(width / 2,34,'TDTU Conduct Score Management System','text-anchor="middle" style="font-size:27px;font-weight:700;fill:#154a9b"')}${text(width / 2,62,'Relational Data Model — Essential Attributes','text-anchor="middle" style="font-size:20px"')}${text(width / 2,86,`${models.length} tables · ${edges.length} foreign keys · PK = primary key · FK = foreign key · U = unique · ? = nullable`,'text-anchor="middle"')}${edges.join('\n')}${cards}${portLabels.join("\n")}${text(90,height-10,'Arrows: FK → referenced key. Hover a column or line for the exact destination. Composite PK: user_roles(userId, roleId).','class="reference"')}</svg>`;
writeFileSync('Docs/ERD/RDM-Essential.svg',svg);
const mermaid = ['erDiagram'];
for (const model of models) {
  mermaid.push(`    ${model.table} {`);
  for (const field of model.fields) {
    const flags = [field.pk ? 'PK' : '',field.fk ? 'FK' : '',field.unique ? 'UK' : ''].filter(Boolean).join(',');
    mermaid.push(`        ${field.type} ${field.name}${flags?' '+flags:''} "${field.nullable?'nullable; ':''}${field.destination??''}"`);
  }
  mermaid.push('    }');
  for (const relation of model.relations) {
    const field = model.fields.find(field => field.name === relation.field);
    const target = lookup.get(relation.target);
    mermaid.push(`    ${target.table} ${field.nullable?'|o':'||'}..${field.unique?'o|':'o{'} ${model.table} : "${relation.field}"`);
  }
}
writeFileSync('Docs/ERD/RDM-Essential.mmd',mermaid.join('\n')+'\n');
const report = ['# RDM rút gọn thuộc tính','',`Sinh từ schema Prisma: **${models.length} bảng, ${edges.length} khóa ngoại**. Giữ tất cả PK/FK, kể cả người thao tác và tự tham chiếu; giữ các cột tham gia unique tổ hợp. Không chỉnh các ảnh ERD của người dùng.`, '', '- [SVG](RDM-Essential.svg)', '- [Mermaid](RDM-Essential.mmd)', '', 'Mũi tên đi từ FK tới khóa được tham chiếu. Di chuột lên cột/đường để xem đích. F01… là số tham chiếu, không phải tên cột. Dấu ? nghĩa là nullable, không thuộc tên cột. UserRole có PK ghép (userId, roleId).', '', 'Outbox aggregateId không phải FK. Schedule, FreeTime, RolePermission, UserRole và ConductScoreCriterionTotal đều là bảng riêng trong RDM.', '', 'Bản này lược thuộc tính để dễ đọc; không phải bản DDL đầy đủ. Các ràng buộc unique tổ hợp hiển thị dưới bảng trên SVG; Mermaid chỉ thể hiện unique một cột.', '', '| Bảng | Cột được lược |', '| --- | --- |'];
for (const model of models) report.push(`| ${model.table} | ${model.omitted.join(', ') || 'Không'} |`);
report.push('', 'Sinh lại: `node Docs/ERD/generate-rdm-summary.mjs`.');
writeFileSync('Docs/ERD/RDM-Essential.md',report.join('\n')+'\n');
console.log(`Verified ${models.length} tables, ${edges.length}/${expected} FK columns and targets; output ${width} x ${height}.`);
