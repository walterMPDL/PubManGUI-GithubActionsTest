import { IdType, ItemVersionRO } from "../model/inge";
import { FormArray, FormGroup, FormControl } from "@angular/forms";

const reParamSplit = /\s*;\s*/
const reHeaderSplit = /\s*:\s*/
const rePropertySplit = /\s*=\s*(.+)/
const reEncodingSplit = /\s*'[^']*'\s*(.*)/
const reQuotesTrim = /(?:^["'\s]*)|(?:["'\s]*$)/g

const isFormValueEmpty = (value: any) => {
  return value === null || value === undefined || value === '' || value === '0: null' || ((typeof value === 'string') && value.trim().length === 0)
}

/**
 * Checks if a form (FormGroup or FormArray) contains any values that are not undefined, null, or empty string
 */
const hasFormValues = (form: FormGroup | FormArray | any): boolean => {
  if (!form) return false;

  // direct FormControl (or similar) – just check its value
  if (form instanceof FormControl) {
    return !isFormValueEmpty(form.value);
  }
  
  if (form instanceof FormArray) {
    return form.length > 0 && form.controls.some((control: any) => hasFormValues(control));
  }
  
  if (form instanceof FormGroup) {
    return Object.keys(form.controls).some((key) => {
      const control = form.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        return hasFormValues(control);
      }
      const value = control?.value;
      return !isFormValueEmpty(value);
    });
  }

  // fallback for any other value-like object
  if (form && typeof form === 'object' && 'value' in form) {
    return !isFormValueEmpty(form.value);
  }

  return false;
}

const versionIdToObjectId = (id: string): string => {
    return id.substring(0, id.lastIndexOf('_'));
}

const itemToVersionId = (item: ItemVersionRO): string => {
  return item.objectId + '_' + item.versionNumber;
}

const contentDispositionParser = (data: string | null) => {
  if (!(data && typeof data === 'string')) {
    return
  }
  const headerSplit = data.split(reParamSplit)
    .map(item => item.trim())
    .filter(item => !!item)

  let type = headerSplit.shift()
  if (!type) {
    return
  }
  const types = type.toLowerCase().split(reHeaderSplit)
  type = types[1] || types[0]

  return headerSplit
    .map(prop => prop.split(rePropertySplit))
    .reduce((o: {[key:string] : any}, [key, value]) => {
      if (!value) {
        o[key] = true
      } else if (key.slice(-1) === '*') {
        let encoding
        [encoding, value] = value.split(reEncodingSplit)
        if (value) {
          try {
            value = decodeURIComponent(value)
          } catch (e) { }
          o[key.slice(0, -1).toLowerCase()] = value
        }
        o['encoding'] = encoding.toLowerCase()
      } else if (!(key in o)) {
        o[key.toLowerCase()] = value.replace(reQuotesTrim, '')
      }
      return o
    }, { type })
}

export const humanFileSize = (bytes: number): `${number} ${'B' | 'KB' | 'MB' | 'GB' | 'TB'}` => {
  if(!bytes || bytes === 0) return '0 B';
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = (['B', 'KB', 'MB', 'GB', 'TB'] as const)[index];
  //No fraction digits for bytes and kilobytes
  const fractionDigits = (unit === 'B' || unit==='KB') ? 0 : 2
  return `${Number((bytes / Math.pow(1024, index)).toFixed(fractionDigits)) * 1} ${unit}`;
};

export const identifierUriToEnum = (idUri: string): IdType | undefined => {
  if(idUri) {
    const val = idUri.substring(idUri.lastIndexOf('/')+1, idUri.length);

    return (<any>IdType)[val];
  }
  return undefined;
}

export const removeDuplicates = (array: any[], key: any) => {
  return array.reduce((arr, item) => {
    const removed = arr.filter((i:any) => i[key] !== item[key]);
    return [...removed, item];
  }, []);
};

export {
  contentDispositionParser,
  versionIdToObjectId,
  itemToVersionId,
  isFormValueEmpty,
  hasFormValues
}
