import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  clearAllData,
  exportAllData,
  importAllData,
  getHands,
  getPlayers,
} from '../utils/storage';

export default function Settings() {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handsCount = getHands().length;
  const playersCount = getPlayers().length;

  const handleClearData = () => {
    clearAllData();
    setShowConfirmClear(false);
    window.location.reload();
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-hands-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAllData(content);
      setImportStatus(success ? 'success' : 'error');
      setTimeout(() => {
        setImportStatus('idle');
        if (success) {
          window.location.reload();
        }
      }, 2000);
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">設定</h1>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="flex-1 px-4 py-6 space-y-6">
        {/* データ統計 */}
        <section className="bg-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-4">データ統計</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{handsCount}</div>
              <div className="text-sm text-gray-400">ハンド数</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{playersCount}</div>
              <div className="text-sm text-gray-400">プレイヤー数</div>
            </div>
          </div>
        </section>

        {/* データ管理 */}
        <section className="bg-gray-800 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-medium text-gray-400">データ管理</h2>

          {/* エクスポート */}
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 btn-tap"
          >
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <div className="text-left">
              <div className="font-medium">データをエクスポート</div>
              <div className="text-sm text-gray-400">JSONファイルとしてダウンロード</div>
            </div>
          </button>

          {/* インポート */}
          <button
            onClick={handleImportClick}
            className={`w-full flex items-center gap-3 p-4 rounded-lg btn-tap ${
              importStatus === 'success'
                ? 'bg-green-900'
                : importStatus === 'error'
                  ? 'bg-red-900'
                  : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div className="text-left">
              <div className="font-medium">
                {importStatus === 'success'
                  ? 'インポート成功!'
                  : importStatus === 'error'
                    ? 'インポート失敗'
                    : 'データをインポート'}
              </div>
              <div className="text-sm text-gray-400">JSONファイルから復元</div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 全削除 */}
          <button
            onClick={() => setShowConfirmClear(true)}
            className="w-full flex items-center gap-3 p-4 bg-gray-700 rounded-lg hover:bg-red-900/50 btn-tap"
          >
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-red-400">全データを削除</div>
              <div className="text-sm text-gray-400">すべてのハンドとプレイヤーを削除</div>
            </div>
          </button>
        </section>

        {/* アプリ情報 */}
        <section className="bg-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-4">アプリ情報</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <div>NLH Hand Recorder v1.0.0</div>
            <div className="text-gray-500">
              ライブポーカーのハンドを素早く記録するためのアプリ
            </div>
          </div>
        </section>
      </main>

      {/* 削除確認モーダル */}
      {showConfirmClear && (
        <div className="modal-overlay" onClick={() => setShowConfirmClear(false)}>
          <div
            className="modal-content p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">全データを削除しますか？</h3>
            <p className="text-gray-400 mb-6">
              この操作は取り消せません。<br />
              すべてのハンド（{handsCount}件）とプレイヤー（{playersCount}人）が削除されます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 btn-tap"
              >
                キャンセル
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 py-3 bg-red-600 rounded-lg hover:bg-red-500 font-medium btn-tap"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
