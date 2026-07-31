/**
 * Мост «`$component(FileUpload)` из схемы → hexa-ui `Uploader`». Самое широкое расхождение из всех
 * контролов — расходятся и имена пропов, и единицы измерения, и сам тип значения.
 *
 * Значение. Модель держит `File[] | null` (файлы уходят на сервер уже при submit, отдельного
 * upload-эндпоинта в демо нет), hexa-ui — свой `UploadFile[]` с `uid`/`status`/`originFileObj`.
 * Перекладку делает обёртка, а не адаптер: список нужно отдавать СТАБИЛЬНЫМ по ссылке, иначе
 * `Uploader` пересобирает его на каждый рендер соседних полей.
 *
 * Пропы. `hint → description`, `maxFiles → maxCount`, `maxFileSize` из БАЙТОВ в КИЛОБАЙТЫ,
 * `multiple: false → maxCount: 1` (своего `multiple` у hexa-ui нет — он выводится из `maxCount`).
 * `variant` уходит в никуда: `Uploader` всегда drop-зона, то есть ровно `variant: "dropzone"` из
 * схемы. `placeholder` своего слота не имеет — складываем его к `description`.
 *
 * `manual: true` обязателен: без него `Uploader` начинает POST-ить файлы сразу после выбора, а
 * адреса для загрузки у формы нет.
 *
 * Потеря по сравнению с ui-kit: коды отказов (`onReject` + `ValidationMessagesProvider`) hexa-ui
 * наружу не отдаёт — тексты про размер/количество показывает сам.
 */

import { useMemo, useRef } from 'react';
import { Uploader } from '@kaspersky/hexa-ui';
import type { UploadFile, UploaderProps } from '@kaspersky/hexa-ui';
import type { FieldAdapter } from '@reformer/renderer-react';

/** Аргумент `onChange` у `Uploader`: пакет отдаёт наружу только сам тип пропа. */
type UploadChangeInfo = Parameters<NonNullable<UploaderProps['onChange']>>[0];

export interface HexaUploaderProps {
  /** Значение модели: сами `File`ы. */
  value?: File[] | null;
  onChange?: (value: File[] | null) => void;
  /** Рендерер всегда прокидывает blur; у drop-зоны его нет — зовём после выбора файлов. */
  onBlur?: () => void;
  /** ui-kit: подпись внутри зоны. */
  placeholder?: string;
  /** ui-kit: текст требований. hexa-ui: `description`. */
  hint?: string;
  /** ui-kit: `button | dropzone | input`. hexa-ui `Uploader` — всегда drop-зона. */
  variant?: 'button' | 'dropzone' | 'input';
  accept?: string;
  /** ui-kit: разрешить несколько файлов. hexa-ui выводит это из `maxCount`. */
  multiple?: boolean;
  /** ui-kit: максимум файлов. hexa-ui: `maxCount`. */
  maxFiles?: number;
  /** ui-kit: максимальный размер файла в БАЙТАХ. hexa-ui ждёт КИЛОБАЙТЫ. */
  maxFileSize?: number;
  disabled?: boolean;
  className?: string;
  /** Проставляет рендерер (из `componentProps.testId` либо пути сигнала). */
  'data-testid'?: string;
}

/**
 * `uid` у файлов, пришедших не из `Uploader` (например, восстановленных с сервера): rc-upload
 * проставляет его прямо на `File`, а у чужих его нет. Держим в WeakMap, а не мутируем `File`, —
 * значение читается в рендере, и мутация делала бы его нечистым.
 */
const SYNTHETIC_UIDS = new WeakMap<File, string>();
let syntheticUidCounter = 0;

function uidOf(file: File): string {
  const own = (file as { uid?: unknown }).uid;
  if (typeof own === 'string') return own;

  let uid = SYNTHETIC_UIDS.get(file);
  if (uid === undefined) {
    syntheticUidCounter += 1;
    uid = `reformer-file-${syntheticUidCounter}`;
    SYNTHETIC_UIDS.set(file, uid);
  }
  return uid;
}

/**
 * `status` намеренно оставляем пустым: именно так `Uploader` помечает файл, выбранный, но не
 * отправленный (режим `manual`). При `'done'` строка списка стала бы кнопкой «скачать», а ссылки нет.
 */
function toUploadFile(file: File): UploadFile {
  return {
    uid: uidOf(file),
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    originFileObj: file as UploadFile['originFileObj'],
  };
}

export function HexaUploader({
  value,
  onChange,
  onBlur,
  placeholder,
  hint,
  variant: _variant,
  accept,
  multiple,
  maxFiles,
  maxFileSize,
  disabled,
  className,
  'data-testid': testId,
}: HexaUploaderProps) {
  // Последний список, отданный самим `Uploader`: если модель хранит ровно те файлы, что мы из него
  // и достали, возвращаем список как есть — так у строк сохраняются uid и статусы.
  const lastEmitted = useRef<{ files: File[]; fileList: UploadFile[] } | null>(null);

  const fileList = useMemo<UploadFile[]>(() => {
    if (!value || value.length === 0) return [];

    const cached = lastEmitted.current;
    if (cached !== null && cached.files === value) return cached.fileList;

    return value.map(toUploadFile);
  }, [value]);

  const handleChange = (info: UploadChangeInfo): void => {
    // Файлы без `originFileObj` (пришли бы только из ответа сервера) в модель положить нечего.
    const files = info.fileList
      .map((item) => item.originFileObj)
      .filter((file): file is NonNullable<UploadFile['originFileObj']> => file !== undefined);

    lastEmitted.current = { files, fileList: info.fileList };
    onChange?.(files.length > 0 ? files : null);
    // Своего blur у зоны нет, а непотроганное поле не покажет ошибку — метим его на выборе файлов.
    onBlur?.();
  };

  // Оба текста схемы кладём в единственный текстовый слот hexa-ui — своего места у `placeholder` нет.
  const description =
    placeholder === undefined && hint === undefined ? undefined : (
      <>
        {placeholder === undefined ? null : <div>{placeholder}</div>}
        {hint === undefined ? null : <div>{hint}</div>}
      </>
    );

  // Пропы перечислены поимённо: `...rest` протащил бы в DOM всё, что рендерер положил в
  // `componentProps` сверх известного контролу (см. тот же приём в `HexaInput`).
  return (
    <Uploader
      accept={accept}
      disabled={disabled}
      className={className}
      data-testid={testId}
      description={description}
      maxCount={multiple === false ? 1 : maxFiles}
      maxFileSize={maxFileSize === undefined ? undefined : Math.floor(maxFileSize / 1024)}
      manual
      fileList={fileList}
      onChange={handleChange}
    />
  );
}

/**
 * Адаптер здесь минимальный: перекладку значения делает обёртка (ей нужна ссылочная стабильность
 * списка, а `toValue` вызывается на каждый рендер). Остаётся снять `label` — его рисует `HexaField` —
 * и не дать рендереру подмешать в контрол ноду формы (`control`).
 */
export const UPLOADER_ADAPTER: FieldAdapter = { strip: ['label'] };
