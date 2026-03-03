import { Directive, Input } from '@angular/core';
import { ItemFilterDirective } from "./item-filter.directive";
import { ItemVersionState } from "../../../../model/inge";
import { FilterEvent } from "../../item-list.component";
import { TranslateService } from "@ngx-translate/core";
import { AaService } from "../../../../services/aa.service";


@Directive({
  selector: '[pureItemStateFilter]',

    providers: [{
    provide: ItemFilterDirective,
    useExisting: ItemStateFilterDirective
  }],

  standalone: true
})
export class ItemStateFilterDirective extends ItemFilterDirective {
  @Input() includePending: boolean = true;

  states: string[] = Object.keys(ItemVersionState);
  options: { [p: string]: string };

  constructor(private translateService: TranslateService, private aaService: AaService) {
    super();
    if(!this.includePending) {
      this.states.splice(this.states.indexOf(ItemVersionState.PENDING.valueOf()), 1);
    }
    this.options =  Object.assign({'': translateService.instant('ItemState.ALL_BUT_WITHDRAWN')}, ...this.states.map(x => ({ [x]: 'ItemState.' + [x] })));

  }


  getOptions():{[key:string]: string } {
    return this.options;
  }

  getFilterEvent(selectedValue: string|undefined) : FilterEvent {
    //console.log("selectedValue: " + selectedValue);
    let query = undefined;
    if(ItemVersionState.WITHDRAWN === selectedValue) {
      query =
        {
          bool: {
            must: [
              {term: {publicState: ItemVersionState.WITHDRAWN.valueOf()}}
            ]
          }
        }
    }
    else {
      const selectedStatesWithoutWithdrawn = selectedValue ? [selectedValue] : this.states.filter(x => x !== ItemVersionState.WITHDRAWN.valueOf());
      const filterOutQuery = this.aaService.filterOutQuery(selectedStatesWithoutWithdrawn);
      query =
        {
          bool: {
            must: [{
              terms: {
                versionState: selectedStatesWithoutWithdrawn
              }
            }
            ],
            must_not: [
              {term: {publicState: ItemVersionState.WITHDRAWN.valueOf()}},
              ...(filterOutQuery ? [filterOutQuery] : [])
            ]
          }
        }
    }



    const fe: FilterEvent = {
      name: "stateFilter",
      query: query
    }
    return fe; // this will pass the $event object to the parent component.
  }
}
