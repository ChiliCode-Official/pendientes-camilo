/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT - BACKEND PARA PENDIENTES CAMILO GUERRA & MANAGER
 * ==============================================================================
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Crea una hoja de cálculo nueva en Google Sheets (ej: "Pendientes Camilo & Manager").
 * 2. En el menú superior ve a: Extensiones -> Apps Script.
 * 3. Borra el código existente y pega TODO este archivo.
 * 4. Haz clic en el botón "Implementar" (Deploy) -> "Nueva implementación" (New deployment).
 * 5. Tipo: "Aplicación web" (Web app).
 *    - Descripción: "API Pendientes v1"
 *    - Ejecutar como: "Yo" (tu cuenta de Google)
 *    - Quién tiene acceso: "Cualquiera" (Anyone) -> IMPORTANTE para que la PWA pueda leer y escribir.
 * 6. Haz clic en "Implementar", autoriza los permisos requeridos.
 * 7. Copia la "URL de la aplicación web" (termina en /exec) y pégala en los ajustes de la PWA.
 * ==============================================================================
 */

const SHEET_NAME = 'Pendientes';
const HEADERS = [
  'id',
  'fechaCreacion',
  'creador',
  'asignadoA',
  'categoria',
  'titulo',
  'descripcion',
  'prioridad',
  'estado',
  'linkReferencia',
  'linkEntrega',
  'fechaLimite',
  'ultimaModificacion'
];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    // Dar estilo visual a la fila de encabezados
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4F46E5');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  } else {
    // Crear encabezados si la hoja existe pero está vacía.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    } else {
      migrateOldHeaders(sheet);
    }
  }
  return sheet;
}

function migrateOldHeaders(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  const oldLinkIndex = currentHeaders.indexOf('linkMedia') !== -1 ? currentHeaders.indexOf('linkMedia') : currentHeaders.indexOf('linkReferencia');

  // Versiones anteriores tenían linkMedia en J. Insertamos linkEntrega en K.
  if (oldLinkIndex !== -1 && currentHeaders.indexOf('linkEntrega') === -1) {
    sheet.insertColumnAfter(oldLinkIndex + 1);
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#4F46E5')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getItems';
    
    // Soporte para operaciones por GET (máxima compatibilidad sin problemas de CORS)
    if (action === 'saveItem' && (e.parameter.item || e.parameter.data)) {
      const raw = e.parameter.item || e.parameter.data;
      const item = JSON.parse(raw);
      const result = saveOrUpdateItem(item);
      return jsonResponse({ success: true, result: result });
    }

    if (action === 'updateStatus' && e.parameter.id && e.parameter.estado) {
      const result = updateItemStatus(e.parameter.id, e.parameter.estado);
      return jsonResponse({ success: true, result: result });
    }

    if (action === 'deleteItem' && e.parameter.id) {
      const result = deleteItemById(e.parameter.id);
      return jsonResponse({ success: true, result: result });
    }

    if (action === 'getItems') {
      const items = getAllItems();
      return jsonResponse({ success: true, data: items });
    }

    return jsonResponse({ success: false, error: 'Acción no reconocida: ' + action });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action || 'getItems';

    if (action === 'getItems') {
      const items = getAllItems();
      return jsonResponse({ success: true, data: items });
    }

    if (action === 'saveItem') {
      const item = payload.item;
      const result = saveOrUpdateItem(item);
      return jsonResponse({ success: true, result: result });
    }

    if (action === 'updateStatus') {
      const { id, estado } = payload;
      const result = updateItemStatus(id, estado);
      return jsonResponse({ success: true, result: result });
    }

    if (action === 'deleteItem') {
      const { id } = payload;
      const result = deleteItemById(id);
      return jsonResponse({ success: true, result: result });
    }

    if (action === 'batchSync') {
      const items = payload.items || [];
      const results = items.map(item => saveOrUpdateItem(item));
      return jsonResponse({ success: true, results: results, all: getAllItems() });
    }

    return jsonResponse({ success: false, error: 'Acción no reconocida' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function getAllItems() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const items = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue; // ID vacío

    const item = {
      id: String(row[0]),
      fechaCreacion: row[1] ? String(row[1]) : '',
      creador: row[2] ? String(row[2]) : '',
      asignadoA: row[3] ? String(row[3]) : '',
      categoria: row[4] ? String(row[4]) : '',
      titulo: row[5] ? String(row[5]) : '',
      descripcion: row[6] ? String(row[6]) : '',
      prioridad: row[7] ? String(row[7]) : 'Media',
      estado: row[8] ? String(row[8]) : 'Pendiente',
      linkReferencia: row[9] ? String(row[9]) : '',
      linkEntrega: row[10] ? String(row[10]) : '',
      fechaLimite: row[11] ? String(row[11]) : '',
      ultimaModificacion: row[12] ? String(row[12]) : ''
    };
    items.push(item);
  }

  return items;
}

function saveOrUpdateItem(item) {
  if (!item || !item.id) {
    throw new Error('Falta el ID del elemento');
  }

  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  const now = new Date().toISOString();
  let foundRow = -1;

  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(item.id)) {
        foundRow = i + 2; // +2 porque empieza en fila 2
        break;
      }
    }
  }

  const rowValues = [
    item.id,
    item.fechaCreacion || now,
    item.creador || 'Manager',
    item.asignadoA || 'Camilo Guerra',
    item.categoria || 'Pendientes Urgentes',
    item.titulo || '',
    item.descripcion || '',
    item.prioridad || 'Media',
    item.estado || 'Pendiente',
    item.linkReferencia || item.linkMedia || '',
    item.linkEntrega || '',
    item.fechaLimite || '',
    now
  ];

  if (foundRow > 0) {
    // Actualizar fila existente
    sheet.getRange(foundRow, 1, 1, HEADERS.length).setValues([rowValues]);
    return { action: 'updated', id: item.id };
  } else {
    // Añadir nueva fila al final
    sheet.appendRow(rowValues);
    return { action: 'created', id: item.id };
  }
}

function updateItemStatus(id, estado) {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { action: 'not_found', id: id };

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      const rowIndex = i + 2;
      sheet.getRange(rowIndex, 9).setValue(estado); // Columna 9 es 'estado'
      sheet.getRange(rowIndex, 13).setValue(new Date().toISOString()); // Columna 13 es 'ultimaModificacion'
      return { action: 'status_updated', id: id, estado: estado };
    }
  }
  return { action: 'not_found', id: id };
}

function deleteItemById(id) {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { action: 'not_found', id: id };

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      return { action: 'deleted', id: id };
    }
  }
  return { action: 'not_found', id: id };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
