import {
  afterNextRender,
  ContentChild, ContentChildren,
  Directive,
  ElementRef,
  HostBinding,
  Input,
  Optional, QueryList, Renderer2,
  Self,
  ViewChild, ViewChildren,
  ViewContainerRef,
  ViewRef
} from '@angular/core';
import { AbstractControl, AbstractControlDirective, ControlContainer, NgControl } from "@angular/forms";
import { ValidationErrorComponent } from "../components/shared/validation-error/validation-error.component";


@Directive({
  selector: '.accordion-item'

})
/**
 * Directive that manages the validation state display within an accordion group.
 * This directive specifically targets elements with the CSS class `accordion-item`.
 *
 * It dynamically adds a hidden validation symbol to the accordion header and toggles
 * its visibility based on the presence of invalid form controls within the accordion group.
 */
export class AccordionGroupValidationDirective {

  private accordionButtonElement?: Element;
  private validationSymbolElement?: Element | null;

  constructor(private elementRef: ElementRef
  ) {
  }

  ngAfterViewInit() {
    this.accordionButtonElement = this.elementRef?.nativeElement.querySelector('.accordion-button');
    //Add hidden validation symbol
    this.accordionButtonElement?.insertAdjacentHTML('beforeend', '<span class="bi bi-exclamation-circle-fill ms-1 d-none"></span>');
    this.validationSymbolElement = this.accordionButtonElement?.querySelector(".bi.bi-exclamation-circle-fill");

  }

  ngAfterViewChecked() {
    this.addRemoveValidationInfoToHeader();
  }

  private addRemoveValidationInfoToHeader() {
    const invalid = this.elementRef.nativeElement.querySelector('.ng-invalid') !== null;

    if (invalid) {
      this.validationSymbolElement?.classList.remove('d-none');
    }
    else {
      this.validationSymbolElement?.classList.add('d-none');
    }
  }

}
