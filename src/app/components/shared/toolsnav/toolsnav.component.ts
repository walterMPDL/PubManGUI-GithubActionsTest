import { Component, inject } from '@angular/core';
import { TranslatePipe } from "@ngx-translate/core";
import { AaService } from "../../../services/aa.service";
import { NgbModal, NgbTooltip } from "@ng-bootstrap/ng-bootstrap";
import { JusReportComponent } from "../jus-report/jus-report.component";
import { environment } from 'src/environments/environment';

@Component({
  selector: 'pure-toolsnav',
  templateUrl: './toolsnav.component.html',
    standalone: true,
  imports: [TranslatePipe, NgbTooltip]
})
export class ToolsnavComponent {
    aaService = inject(AaService);
    modalService = inject(NgbModal);
  protected readonly JusReportComponent = JusReportComponent;
  readonly env = environment;
}
