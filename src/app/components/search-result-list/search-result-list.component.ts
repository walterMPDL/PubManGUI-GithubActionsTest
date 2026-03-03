import { Component } from '@angular/core';
import { ItemListComponent } from "../item-list/item-list.component";
import {Observable, of} from "rxjs";
import { AaService } from "../../services/aa.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from "@angular/common";
import { SortSelectorComponent } from "../item-list/filters/sort-selector/sort-selector.component";
import { SearchStateService } from "./search-state.service";
import {
  ItemAggregationFilterComponent
} from "../item-list/aggregations/aggregation-filter/item-aggregation-filter.component";
import {
  ItemCreatorAggregationDirective
} from "../item-list/aggregations/aggregation-filter/directives/item-creator-aggregation.directive";
import {
  ItemGenreAggregationDirective
} from "../item-list/aggregations/aggregation-filter/directives/item-genre-aggregation.directive";
import {
  ItemReviewMethodDirective
} from "../item-list/aggregations/aggregation-filter/directives/item-reviewmethod-aggregation.directive";
import {
  ItemSourceTitleAggregationDirective
} from "../item-list/aggregations/aggregation-filter/directives/item-sourcetitle-aggregation.directive";
import { TranslatePipe } from "@ngx-translate/core";
import {SavedSearchService} from "../../services/pubman-rest-client/saved-search.service";
import {ItemSearchAdvancedService} from "../item-search-advanced/item-search-advanced.service";

@Component({
  selector: 'pure-search-result-list',
  standalone: true,
  imports: [
    ItemListComponent,
    SortSelectorComponent,
    ItemAggregationFilterComponent,
    ItemCreatorAggregationDirective,
    ItemGenreAggregationDirective,
    ItemReviewMethodDirective,
    ItemSourceTitleAggregationDirective,
    TranslatePipe
  ],
  templateUrl: './search-result-list.component.html',
  styleUrl: './search-result-list.component.scss'
})
export class SearchResultListComponent {

   //@ViewChild('child') child: ItemListComponent;
  searchQuery!: Observable<any>;

  constructor(private route:ActivatedRoute, protected searchStateService: SearchStateService, private savedSearchService: SavedSearchService, private advancedSearchService: ItemSearchAdvancedService) {
    this.searchQuery = this.searchStateService.$currentQuery;
    const searchId = this.route.snapshot.queryParamMap.get("searchId");
    const searchForm = this.route.snapshot.queryParamMap.get("searchForm");
    this.searchStateService.initSearchQuery(searchId, searchForm);
  }



}
