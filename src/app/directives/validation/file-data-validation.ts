import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { FileDbVO, Storage, Visibility } from "src/app/model/inge";
import { Errors } from "src/app/model/errors";
import { isFormValueEmpty } from "../../utils/utils";
import { URL_PATTERN } from "../../services/form-builder.service";



export const fileDataValidator: ValidatorFn = (control: AbstractControl,): ValidationErrors | null => {
  const error_types = Errors;
  const file = control.value as FileDbVO;
  let currentErrors = {} as ValidationErrors;
  if (file != null) {
    //External reference with missing content
    if (Storage.EXTERNAL_URL === file.storage) {
      console.log('Validating external URL file with content: ', control.get("content")?.value);
      if(isFormValueEmpty(control.get("content")?.value)) {
        control.get("content")?.setErrors({[error_types.COMPONENT_CONTENT_NOT_PROVIDED] : true});
        //currentErrors[error_types.COMPONENT_CONTENT_NOT_PROVIDED] =  true;
      }
       else if(!URL_PATTERN.test(control.get("content")?.value)) {
         control.get("content")?.setErrors({[error_types.LOCATOR_IS_NO_URI] : true});
       }
      else {
        control.get("content")?.setErrors(null);
      }
    }


    //File with missing content or missing objectId
    if (Storage.INTERNAL_MANAGED === file.storage) {
      if (isFormValueEmpty(file.content)
      && (isFormValueEmpty(file.objectId))) {
        control.get("content")?.setErrors({[error_types.COMPONENT_CONTENT_NOT_PROVIDED] : true});
        currentErrors[error_types.COMPONENT_CONTENT_NOT_PROVIDED] = true;
      }
      else {
        control.get("content")?.setErrors(null);
      }
      if (Visibility.AUDIENCE === file.visibility) {
        let ok = false;
        for (let audienceId of file.allowedAudienceIds) {
          if (!isFormValueEmpty(audienceId) && Object.keys(audienceId).length !== 0) {
            ok = true;
          }
        }
        if (!ok) {
          control.get("allowedAudienceIds")?.setErrors({[error_types.COMPONENT_IP_RANGE_NOT_PROVIDED] : true});
          //currentErrors[error_types.COMPONENT_IP_RANGE_NOT_PROVIDED] = true;
        }
        else {
          control.get("allowedAudienceIds")?.setErrors(null);
        }
      }
      else {
        control.get("allowedAudienceIds")?.setErrors(null);
      }
      //File with missing visibility (internal managed files only)
      if (isFormValueEmpty(file.visibility)) {
        control.get("visibility")?.setErrors({[error_types.COMPONENT_VISIBILITY_NOT_PROVIDED] : true});
        //currentErrors[error_types.COMPONENT_VISIBILITY_NOT_PROVIDED] =  true;
      }
      else {
        control.get("visibility")?.setErrors(null);
      }
    }

    // Metadata validation
    if (file.metadata !== null && file.metadata !== undefined) {
      // File with missing title
      if (isFormValueEmpty(file.metadata.title)) {
        control.get("metadata.title")?.setErrors({[error_types.COMPONENT_FILE_NAME_NOT_PROVIDED] : true});
        //currentErrors[error_types.COMPONENT_FILE_NAME_NOT_PROVIDED] = true;
      }
      else {
        control.get("metadata.title")?.setErrors(null);
      }
      // File with missing content category
      if (isFormValueEmpty(file.metadata.contentCategory)) {
        control.get("metadata.contentCategory")?.setErrors({[error_types.COMPONENT_CONTENT_CATEGORY_NOT_PROVIDED] : true});
        //currentErrors[error_types.COMPONENT_CONTENT_CATEGORY_NOT_PROVIDED] = true;
      }
      else {
        control.get("metadata.contentCategory")?.setErrors(null);
      }
    }


  } // if
  return currentErrors;
}
