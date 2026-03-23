import {
  Directive,
  HostBinding,
  Optional,
  Self,
} from '@angular/core';
import { AbstractControl, ControlContainer, NgControl } from "@angular/forms";

/**
 * Directive to apply Bootstrap validation styling to Angular form elements based on their validation state.
 * This directive attaches validation classes (`is-invalid`) dynamically to form controls
 * to reflect their error state.
 *
 * The directive can be used with template-driven, reactive forms, or a combination of both.
 */
@Directive({
  selector: '[formControlName],[ngModel],[formControl],[formArray],[formArrayName],[formGroup],[formGroupName]',

})

export class BootstrapValidationDirective {

  constructor(@Self() @Optional() private cd: NgControl, @Self() @Optional() private cont: ControlContainer) {
  }

  @HostBinding('class.is-invalid')
  get isInvalid(): boolean {
    // Always read the current control dynamically so that CDK virtual scroll
    // view recycling (where ngOnInit is NOT re-called) picks up the refreshed
    // control reference after FormControlDirective.ngOnChanges runs.
    return isShowValidationError(this.cd?.control || this.cont?.control);
  }

}
export function isShowValidationError(control: AbstractControl | undefined | null): boolean {
  return control !==null && control!== undefined && control.invalid && control.touched;
}
