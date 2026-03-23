import {
  ComponentRef,
  Directive,
  ElementRef,
  Input,
  Optional, Renderer2,
  Self,
  ViewContainerRef,
} from '@angular/core';
import { AbstractControl, ControlContainer, NgControl } from "@angular/forms";
import { ValidationErrorComponent } from "../components/shared/validation-error/validation-error.component";

/**
 * Directive to automatically handle bootstrap-styled validation for form controls.
 * It observes the validation state of a form control or group and dynamically appends validation error messages
 * as a sibling element, either above or below the form control, based on the specified configuration.
 *
 * This directive works with Angular forms, including reactive forms and template-driven forms. It supports
 * validation state detection for individual controls as well as grouped controls.
 *
 * The directive also manages the DOM structure by inserting or appending validation error messages
 * at the appropriate position relative to the input element, taking into account Bootstrap's input-group structure.
 *
 * The validation error messages are rendered using the `ValidationErrorComponent`, which is dynamically created
 * and positioned within the DOM using Angular's rendering utilities.
 *
 * The directive can be used with the following selectors:
 * - formControlName
 * - ngModel
 * - formControl
 * - formArray
 * - formArrayName
 * - formGroup
 * - formGroupName
 *
 * The `validationMessagePosition` property determines the placement of the validation error message and can
 * take the following values:
 * - 'top': The error message is displayed above the form control.
 * - 'bottom': The error message is displayed below the form control (default).
 * - 'ignore': Suppresses the rendering of validation error messages.
 *
 * Host element's invalid state is dynamically tracked, and the `is-invalid` class is applied to the form control
 * when it is in an invalid state.
 */
@Directive({
  selector: '[formControlName],[ngModel],[formControl],[formArray],[formArrayName],[formGroup],[formGroupName]',

})

export class ValidationErrorMessageDirective {

  @Input() validationMessagePosition : 'top' | 'bottom' | 'ignore' = 'bottom'

  private control : AbstractControl | null = null;
  private controlName;
  private errorCompRef?: ComponentRef<ValidationErrorComponent>;

  constructor(@Self() @Optional() private cd: NgControl, @Self() @Optional() private cont: ControlContainer, private elementRef: ElementRef, private viewContainerRef: ViewContainerRef, private renderer: Renderer2
  ) {
    this.controlName = cont?.name?.toString() || cd?.name?.toString() || '';
  }

  ngOnInit() {

    this.control = this.cont?.control || this.cd?.control;

    if(this.validationMessagePosition !== 'ignore'){

      //Default for bottom:
      let parentElement = this.elementRef.nativeElement.parentElement;
      let referenceElement = this.elementRef.nativeElement.nextElementSibling;

      if(this.validationMessagePosition === 'top') {
        referenceElement = this.elementRef.nativeElement;
      }


      if(this.elementRef.nativeElement.parentElement && this.elementRef.nativeElement.parentElement.classList.contains('input-group')){
        parentElement =  this.elementRef.nativeElement.parentElement.parentElement;
        if(this.validationMessagePosition === 'top') {
          referenceElement =  this.elementRef.nativeElement.parentElement;
        }
        else if(this.validationMessagePosition === 'bottom') {
          referenceElement =  this.elementRef.nativeElement.parentElement.nextElementSibling;
        }

      }

      //As ng-containers are not rendered, but create a comment, we need to take the sibling
      if(this.elementRef.nativeElement.nodeName === '#comment'){
        if(this.validationMessagePosition === 'top'){
          referenceElement =  this.elementRef.nativeElement.previousElementSibling;
        }
        else if(this.validationMessagePosition === 'bottom'){
          referenceElement =  this.elementRef.nativeElement.nextElementSibling;
        }

      }


      //Create validation message component
      this.errorCompRef = this.viewContainerRef.createComponent(ValidationErrorComponent);
      this.errorCompRef.instance.name = this.controlName;
      this.errorCompRef.instance.onlyForTouched = false;
      if(this.cd?.control) {
        this.errorCompRef.instance.control = this.cd.control;
      }
      else if (this.cont?.control) {
        this.errorCompRef.instance.control = this.cont.control;
      }

      const errorElement = this.errorCompRef.location.nativeElement;

      //Move component to correct position
      this.renderer.insertBefore(parentElement, errorElement, referenceElement, true);

    }

  }

  /**
   * Called on every change detection cycle. Detects when the underlying form
   * control instance changes (e.g. CDK virtual scroll view recycling reuses this
   * directive instance for a different creator row).  When the reference changes,
   * push the fresh control into the ValidationErrorComponent so it subscribes to
   * the correct control's event stream.
   */
  ngDoCheck() {
    if (!this.errorCompRef) {
      return;
    }
    const latestControl = this.cont?.control || this.cd?.control;
    if (latestControl !== this.control) {
      this.control = latestControl;
      this.errorCompRef.instance.control = latestControl;
    }
  }

}
