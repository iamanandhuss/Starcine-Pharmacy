import React, { useState, useEffect } from 'react';
import {
  Square, Undo, Redo, Lock, Unlock,
  Grid, ZoomIn, ZoomOut, Maximize2, Save, Info
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';

interface LayoutAsset {
  id: string;
  asset_name: string;
  asset_code: string;
  category: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  rotation: number;
  background_color: string;
  border_color: string;
  text_color: string;
  is_locked: boolean;
  remarks: string;
  assigned_user_id: string | null;
  frequency: string; // 'Daily' | 'Weekly' | 'Monthly'
  branch_id?: string;
}

interface Employee {
  id: string;
  full_name: string;
}

export const StoreLayout: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [assets, setAssets] = useState<LayoutAsset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Canvas View Settings
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // History Stacks for Undo/Redo
  const [undoStack, setUndoStack] = useState<LayoutAsset[][]>([]);
  const [redoStack, setRedoStack] = useState<LayoutAsset[][]>([]);

  // Dragging & Resizing Interactions
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingAssetId, setResizingAssetId] = useState<string | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState({ w: 0, h: 0 });
  const [resizeStartMouse, setResizeStartMouse] = useState({ x: 0, y: 0 });

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const pushStateToHistory = (currentState: LayoutAsset[]) => {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(currentState))]);
    setRedoStack([]); // Clear redo
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(assets))]);
    setAssets(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(assets))]);
    setAssets(next);
  };

  const fetchData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const [assetsRes, empRes] = await Promise.all([
        supabase.from('layout_assets').select('*').eq('branch_id', selectedStoreId),
        supabase.from('users').select('id, full_name').eq('branch_id', selectedStoreId).eq('is_active', true)
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (empRes.error) throw empRes.error;

      setEmployees(empRes.data || []);

      if (!assetsRes.data || assetsRes.data.length === 0) {
        // Fallback default starting layout
        const defaults: LayoutAsset[] = [
          { id: '1', asset_name: 'Main Counter A', asset_code: 'CTR-A', category: 'Counter', x_position: 100, y_position: 150, width: 200, height: 60, rotation: 0, background_color: '#3B82F6', border_color: '#1D4ED8', text_color: '#FFFFFF', is_locked: false, remarks: 'Main patient checkin', assigned_user_id: null, frequency: 'Daily' },
          { id: '2', asset_name: 'Medication Rack #1', asset_code: 'RCK-1', category: 'Rack', x_position: 400, y_position: 100, width: 120, height: 80, rotation: 0, background_color: '#10B981', border_color: '#047857', text_color: '#FFFFFF', is_locked: false, remarks: 'A-G catalog shelves', assigned_user_id: null, frequency: 'Weekly' },
          { id: '3', asset_name: 'Cold-chain Fridge', asset_code: 'REF-01', category: 'Refrigerator', x_position: 400, y_position: 250, width: 80, height: 80, rotation: 0, background_color: '#EF4444', border_color: '#B91C1C', text_color: '#FFFFFF', is_locked: true, remarks: 'Insulin stocks', assigned_user_id: null, frequency: 'Daily' },
        ];
        setAssets(defaults);
      } else {
        // Map database columns to local structure
        const mapped = assetsRes.data.map(item => ({
          id: item.id,
          asset_name: item.name || 'Layout Item',
          asset_code: `CODE-${item.id.substring(0, 4).toUpperCase()}`,
          category: item.type || 'Rack',
          x_position: Number(item.x) || 0,
          y_position: Number(item.y) || 0,
          width: Number(item.width) || 100,
          height: Number(item.height) || 60,
          rotation: Number(item.rotation) || 0,
          background_color: item.bg_color || '#3B82F6',
          border_color: '#1E293B',
          text_color: item.text_color || '#FFFFFF',
          is_locked: !!item.locked,
          remarks: item.remarks || '',
          assigned_user_id: item.assigned_user_id || null,
          frequency: item.frequency || 'Daily',
          branch_id: item.branch_id
        })) as LayoutAsset[];
        setAssets(mapped);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  // Asset Creation Palette
  const addAssetToCanvas = (category: string) => {
    pushStateToHistory(assets);
    const newAsset: LayoutAsset = {
      id: Math.random().toString(36).substring(7),
      asset_name: `New ${category}`,
      asset_code: `CODE-${Math.floor(Math.random()*900 + 100)}`,
      category,
      x_position: Math.round((150 - panOffset.x) / 10) * 10,
      y_position: Math.round((150 - panOffset.y) / 10) * 10,
      width: category === 'Door' || category === 'Exit' ? 40 : 100,
      height: category === 'Door' || category === 'Exit' ? 40 : 60,
      rotation: 0,
      background_color: category === 'Refrigerator' ? '#EF4444' : category === 'Counter' ? '#3B82F6' : '#10B981',
      border_color: '#1E293B',
      text_color: '#FFFFFF',
      is_locked: false,
      remarks: '',
      assigned_user_id: null,
      frequency: 'Daily',
    };
    setAssets(prev => [...prev, newAsset]);
    setSelectedAssetId(newAsset.id);
    showToast(`Added ${category} to editor`);
  };



  // Dragging handlers
  const onMouseDownAsset = (e: React.MouseEvent, asset: LayoutAsset) => {
    if (asset.is_locked) return;
    e.stopPropagation();
    setSelectedAssetId(asset.id);
    setDraggingAssetId(asset.id);
    
    // Mouse relative offset within the asset
    const rawX = e.clientX / zoom - asset.x_position;
    const rawY = e.clientY / zoom - asset.y_position;
    setDragOffset({ x: rawX, y: rawY });
  };

  const onMouseDownResize = (e: React.MouseEvent, asset: LayoutAsset) => {
    e.stopPropagation();
    setResizingAssetId(asset.id);
    setResizeStartSize({ w: asset.width, h: asset.height });
    setResizeStartMouse({ x: e.clientX, y: e.clientY });
  };

  const onMouseMoveCanvas = (e: React.MouseEvent) => {
    if (draggingAssetId) {
      const asset = assets.find(a => a.id === draggingAssetId);
      if (!asset) return;
      
      let newX = e.clientX / zoom - dragOffset.x;
      let newY = e.clientY / zoom - dragOffset.y;

      if (snapToGrid) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
      }

      setAssets(prev => prev.map(a => a.id === draggingAssetId ? { ...a, x_position: newX, y_position: newY } : a));
    } else if (resizingAssetId) {
      const asset = assets.find(a => a.id === resizingAssetId);
      if (!asset) return;

      const deltaX = (e.clientX - resizeStartMouse.x) / zoom;
      const deltaY = (e.clientY - resizeStartMouse.y) / zoom;

      let newW = Math.max(20, resizeStartSize.w + deltaX);
      let newH = Math.max(20, resizeStartSize.h + deltaY);

      if (snapToGrid) {
        newW = Math.round(newW / 10) * 10;
        newH = Math.round(newH / 10) * 10;
      }

      setAssets(prev => prev.map(a => a.id === resizingAssetId ? { ...a, width: newW, height: newH } : a));
    } else if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const onMouseUpCanvas = () => {
    if (draggingAssetId || resizingAssetId) {
      pushStateToHistory(assets);
    }
    setDraggingAssetId(null);
    setResizingAssetId(null);
    setIsPanning(false);
  };

  const handleUpdateProperty = (field: keyof LayoutAsset, val: any) => {
    if (!selectedAssetId) return;
    setAssets(prev => prev.map(a => a.id === selectedAssetId ? { ...a, [field]: val } : a));
  };

  const saveLayoutToDB = async () => {
    if (!selectedStoreId) return;
    try {
      // Clean previous records and write current editor layout state
      await supabase.from('layout_assets').delete().eq('branch_id', selectedStoreId);

      const payload = assets.map(a => ({
        name: a.asset_name,
        type: a.category,
        x: a.x_position,
        y: a.y_position,
        width: a.width,
        height: a.height,
        rotation: a.rotation,
        bg_color: a.background_color,
        text_color: a.text_color,
        locked: a.is_locked,
        remarks: a.remarks,
        assigned_user_id: a.assigned_user_id,
        frequency: a.frequency,
        branch_id: selectedStoreId,
      }));

      const { error } = await supabase.from('layout_assets').insert(payload);
      if (error) throw error;
      showToast('Pharmacy blueprint layout saved successfully');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const activeAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">📐 Store Blueprint designer</h1>
          <p className="text-xs text-dark-500">Visually construct racks, counters, cold-chain refrigerators, and printer points</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleUndo} disabled={undoStack.length === 0} leftIcon={<Undo className="h-4 w-4" />} />
          <Button variant="outline" onClick={handleRedo} disabled={redoStack.length === 0} leftIcon={<Redo className="h-4 w-4" />} />
          <Button onClick={saveLayoutToDB} leftIcon={<Save className="h-4 w-4" />}>Save Designer</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400">Loading store layout editor...</div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Left Side: Palette */}
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Asset Palette</Card.Title>
          </Card.Header>
          <Card.Content className="grid grid-cols-2 gap-2">
            {['Rack', 'Counter', 'Refrigerator', 'Cabinet', 'Door', 'Exit', 'Waiting Area', 'Computer', 'Printer'].map(cat => (
              <button
                key={cat}
                onClick={() => addAssetToCanvas(cat)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dark-200 dark:border-dark-800 hover:bg-dark-50 dark:hover:bg-dark-950/40 text-xs font-bold text-dark-700 dark:text-dark-300 transition-colors"
              >
                <Square className="h-5 w-5 text-brand-500" />
                <span>{cat}</span>
              </button>
            ))}
          </Card.Content>
        </Card>

        {/* Center: Canvas Workspace */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Editor Control Header */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-dark-50/50 dark:bg-dark-900/50 border border-dark-200 dark:border-dark-800 text-xs font-bold">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} />
                <Grid className="h-4 w-4 text-dark-500" /> Snap Grid (10px)
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} className="p-1 rounded hover:bg-dark-200 dark:hover:bg-dark-800"><ZoomOut className="h-4 w-4" /></button>
              <span className="font-mono">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))} className="p-1 rounded hover:bg-dark-200 dark:hover:bg-dark-800"><ZoomIn className="h-4 w-4" /></button>
              <button onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} className="p-1 rounded hover:bg-dark-200 dark:hover:bg-dark-800" title="Reset View"><Maximize2 className="h-4 w-4" /></button>
            </div>
          </div>

          {/* SVG Canvas Board */}
          <div
            className="w-full h-[450px] border border-dark-200 dark:border-dark-800 bg-dark-100 dark:bg-dark-950 relative overflow-hidden rounded-2xl cursor-default"
            onMouseMove={onMouseMoveCanvas}
            onMouseUp={onMouseUpCanvas}
            onMouseDown={e => {
              if (e.button === 0) {
                // Left click on empty space clears selection and starts panning
                setSelectedAssetId(null);
                setIsPanning(true);
                setPanStart({ x: e.clientX, y: e.clientY });
              }
            }}
          >
            {/* Grid Pattern overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:20px_20px]" />

            <svg
              className="w-full h-full"
              style={{
                userSelect: 'none',
              }}
            >
              {/* Group wrapper supporting pan/zoom */}
              <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
                
                {/* Render Assets */}
                {assets.map(asset => {
                  const isSelected = asset.id === selectedAssetId;
                  
                  return (
                    <g
                      key={asset.id}
                      transform={`translate(${asset.x_position}, ${asset.y_position}) rotate(${asset.rotation}, ${asset.width / 2}, ${asset.height / 2})`}
                      onMouseDown={e => onMouseDownAsset(e, asset)}
                    >
                      {/* Box Shape */}
                      <rect
                        width={asset.width}
                        height={asset.height}
                        fill={asset.background_color}
                        stroke={isSelected ? '#3B82F6' : asset.border_color || '#1E293B'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        rx={4}
                      />

                      {/* Label Text */}
                      <text
                        x={asset.width / 2}
                        y={asset.height / 2}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        fill={asset.text_color}
                        fontSize={10}
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {asset.asset_code}
                      </text>

                      {/* Resize Handle (Render only if selected & unlocked) */}
                      {isSelected && !asset.is_locked && (
                        <rect
                          x={asset.width - 8}
                          y={asset.height - 8}
                          width={8}
                          height={8}
                          fill="#3B82F6"
                          stroke="#FFFFFF"
                          strokeWidth={1}
                          className="cursor-se-resize"
                          onMouseDown={e => onMouseDownResize(e, asset)}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* Right Side: Properties Panel */}
        <Card className="lg:col-span-1 flex flex-col">
            <Card.Header className="border-b border-dark-100 dark:border-dark-800/80">
              <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Properties</Card.Title>
            </Card.Header>
            <Card.Content className="p-4 flex-1">
              {activeAsset ? (
                <div className="space-y-4">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Asset Name</label>
                    <input
                      type="text"
                      value={activeAsset.asset_name}
                      onChange={e => handleUpdateProperty('asset_name', e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-dark-200 focus:outline-none focus:border-brand-500 dark:bg-dark-800 dark:border-dark-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Width (px)</label>
                      <input
                        type="number"
                        value={activeAsset.width}
                        disabled={activeAsset.is_locked}
                        onChange={e => handleUpdateProperty('width', Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-dark-200 disabled:opacity-50 dark:bg-dark-800 dark:border-dark-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Height (px)</label>
                      <input
                        type="number"
                        value={activeAsset.height}
                        disabled={activeAsset.is_locked}
                        onChange={e => handleUpdateProperty('height', Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-dark-200 disabled:opacity-50 dark:bg-dark-800 dark:border-dark-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Rotation (°)</label>
                      <input
                        type="number"
                        value={activeAsset.rotation}
                        disabled={activeAsset.is_locked}
                        onChange={e => handleUpdateProperty('rotation', Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-dark-200 disabled:opacity-50 dark:bg-dark-800 dark:border-dark-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Lock Position</label>
                      <button
                        type="button"
                        onClick={() => handleUpdateProperty('is_locked', !activeAsset.is_locked)}
                        className={`w-full text-xs p-2.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 cursor-pointer
                          ${activeAsset.is_locked
                            ? 'bg-red-500/10 border-red-500/20 text-red-600'
                            : 'bg-green-500/10 border-green-500/20 text-green-600'
                          }
                        `}
                      >
                        {activeAsset.is_locked ? (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Locked
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" /> Unlocked
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={activeAsset.background_color}
                        onChange={e => handleUpdateProperty('background_color', e.target.value)}
                        className="w-8 h-8 rounded border p-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={activeAsset.background_color}
                        onChange={e => handleUpdateProperty('background_color', e.target.value)}
                        className="flex-1 text-xs p-2 rounded-lg border border-dark-200 dark:bg-dark-800 dark:border-dark-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Assign Compliance Lead</label>
                    <select
                      value={activeAsset.assigned_user_id || ''}
                      onChange={e => handleUpdateProperty('assigned_user_id', e.target.value || null)}
                      className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:bg-dark-800 dark:border-dark-700"
                    >
                      <option value="">Select pharmacist...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Clean Audit Frequency</label>
                    <select
                      value={activeAsset.frequency}
                      onChange={e => handleUpdateProperty('frequency', e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:bg-dark-800 dark:border-dark-700"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Remarks & Details</label>
                    <textarea
                      value={activeAsset.remarks || ''}
                      onChange={e => handleUpdateProperty('remarks', e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:bg-dark-800 dark:border-dark-700"
                      rows={2}
                      placeholder="E.g. Cold storage limits"
                    />
                  </div>

                </div>
              ) : (
                <div className="text-center py-8 text-xs text-dark-400">
                  <Info className="h-6 w-6 mx-auto mb-2 text-dark-300" />
                  Select any item on the canvas to inspect or adjust properties.
                </div>
              )}
            </Card.Content>
          </Card>

        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};
