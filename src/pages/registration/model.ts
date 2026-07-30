/**
 * Модель формы «registration» — тип данных (источник истины) и начальные значения.
 * Импортируется схемами валидации/поведения/UI. Docs: @reformer/core (FormModel<T>).
 */

export interface FormShape {
  name: string;
  email: string;
  /** Пример вычисляемого поля (заполняется behavior.ts). */
  greeting: string;
}

/** Начальные значения — для createForm/useFormControl. */
export const initialFormModel: FormShape = {
  name: '',
  email: '',
  greeting: '',
};
