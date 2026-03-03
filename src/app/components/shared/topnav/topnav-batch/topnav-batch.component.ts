import { Component, inject, Input } from '@angular/core';
import { MessageService } from "../../../../services/message.service";
import { BatchService } from "../../../batch/services/batch.service";
import { AaService } from "../../../../services/aa.service";
import { ItemSelectionService } from "../../../../services/item-selection.service";
import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";
import { _, TranslatePipe, TranslateService } from "@ngx-translate/core";
import { versionIdToObjectId } from "../../../../utils/utils";

@Component({
  selector: 'pure-topnav-batch',
  standalone: true,
  imports: [
    NgbTooltip,
    TranslatePipe
  ],
  host: {
    style: "display: contents"
  },
  templateUrl: './topnav-batch.component.html',
})
export class TopnavBatchComponent {

  @Input() resetSelectionAfterAction: boolean = true;

  batchSvc = inject(BatchService);
  msgSvc = inject(MessageService);
  aaService = inject(AaService);
  itemSelectionService = inject(ItemSelectionService);
  translateSvc = inject(TranslateService);

  addToBatchDatasets() {
    const selected: string[] = this.itemSelectionService.selectedIds$.value.map(id => versionIdToObjectId(id));;
    if (selected.length) {
      const added = this.batchSvc.addItems(selected);
      if (this.resetSelectionAfterAction)
        this.itemSelectionService.resetList();
      this.msgSvc.success(
        this.translateSvc.instant('batch.name') + ": " +
        added + ' ' + this.translateSvc.instant(_('common.datasets.filled'))
        + ((selected.length! - added) > 0 ? ", " + `${selected.length! - added} `
          + this.translateSvc.instant(_('common.datasets.duplicated'))  + "." : '')
      );
    } else {
      this.msgSvc.warning(this.translateSvc.instant(_('batch.datasets.empty')) + '!');
    }
  }

  removeFromBatchDatasets() {
    const selected: string[] = this.itemSelectionService.selectedIds$.value.map(id => versionIdToObjectId(id));;
    if (selected.length) {
      const removed = this.batchSvc.removeItems(selected);
      if (this.resetSelectionAfterAction)
        this.itemSelectionService.resetList();
      this.msgSvc.success(
        this.translateSvc.instant('batch.name') + ": " +
        removed + ' ' + this.translateSvc.instant(_('common.datasets.removed'))
        + ((selected.length! - removed) > 0 ? ", " + `${selected.length! - removed} `
          + this.translateSvc.instant(_('common.datasets.missing')) + "." : '')
      );
    } else {
      this.msgSvc.warning(this.translateSvc.instant(_('batch.datasets.empty')) + '!');
    }
  }

  get isAdd() {
    const selected: string[] = this.itemSelectionService.selectedIds$.value;
    if (selected.length > 0) {
      return selected.some(id => !this.batchSvc.items.includes(versionIdToObjectId(id)))
    }
    return false;
  }

  get isRemove() {
    const selected: string[] = this.itemSelectionService.selectedIds$.value;
    if (selected.length > 0) {
      return selected.some(id => this.batchSvc.items.includes(versionIdToObjectId(id)))
    }
    return false;
  }

}
