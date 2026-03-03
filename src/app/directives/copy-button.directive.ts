import { Directive, ElementRef, Input } from '@angular/core';
import { CdkCopyToClipboard, Clipboard } from "@angular/cdk/clipboard";
import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";
import { timer } from "rxjs";
import { TranslateService } from "@ngx-translate/core";

@Directive({
  selector: 'button[pureCopyButton]',
  standalone: true,
  hostDirectives: [CdkCopyToClipboard, NgbTooltip],
  host: {
    '[disabled]' : 'copiedSuccessful',
    '(click)' : 'onCopy()',
  }
})
export class CopyButtonDirective {

  @Input() textToCopy?: string;
  @Input() textToCopyCallback?: Function;
  @Input() tooltip?: string;
  copiedSuccessful: boolean = false;

  private copyIcon;

  constructor(private clipboard: Clipboard, private ngbTooltip: NgbTooltip, private elementRef: ElementRef, private translateService: TranslateService) {
    this.copyIcon = document.createElement('i');
    this.elementRef.nativeElement.appendChild(this.copyIcon);
    this.setCopyIcon();

    ngbTooltip.ngbTooltip = translateService.instant('common.copyToClipboard');

  }

  ngOnInit() {
    if(this.tooltip) {
      this.ngbTooltip.ngbTooltip = this.tooltip;
    }
  }

  onCopy() {
    console.log('copied');
    if(this.textToCopy) {
      this.clipboard.copy(this.textToCopy);
    }
    else if(this.textToCopyCallback) {
      this.clipboard.copy(this.textToCopyCallback());
    }

    this.copiedSuccessful = true;
    this.setSuccessIcon()
    timer(1000).subscribe(() => {
      this.copiedSuccessful = false;
      this.setCopyIcon()
    })
  }

  private setCopyIcon() {
    this.copyIcon.className = 'bi bi-copy';
  }

  private setSuccessIcon() {
    this.copyIcon.className = 'bi bi-check-lg';
  }

  ngOnDestroy() {
    //this.copySubscription.unsubscribe()
  }

}
