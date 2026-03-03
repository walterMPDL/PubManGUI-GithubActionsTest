import {inject, Injectable} from '@angular/core';
import {BehaviorSubject, catchError, tap} from "rxjs";
import {ItemSearchAdvancedService} from "../item-search-advanced/item-search-advanced.service";
import {SavedSearchService} from "../../services/pubman-rest-client/saved-search.service";
import {ActivatedRoute} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {

  advancedSearchService = inject(ItemSearchAdvancedService);
  savedSearchService = inject(SavedSearchService);
  route = inject(ActivatedRoute);

  $currentQuery = new BehaviorSubject<object | undefined>(undefined)

  type: 'simple' | 'advanced' = 'simple';

  constructor() {
    this.$currentQuery.subscribe((query) => {
      if (query) {
        localStorage.setItem("last_search_query", JSON.stringify(query));
      }
    })
  }

  initSearchQuery(savedSearchId: string|undefined|null, jsonFormString?: string|undefined|null ) {
    const lastQuery = localStorage.getItem("last_search_query");
    if (savedSearchId) {
      this.savedSearchService.retrieve(savedSearchId).pipe(
        tap(savedSearch => {
          //console.log("Retrieved saved search: " + JSON.stringify(savedSearch));
          this.advancedSearchService.getElasticsearchQueryFromFormJson(savedSearch.searchForm).subscribe(query => {
            //console.log("Saved search query: " + JSON.stringify(query));
            this.$currentQuery.next(query);
          });
        })
      ).subscribe();
    }
    else if (jsonFormString) {
      this.advancedSearchService.getElasticsearchQueryFromFormJson(JSON.parse(jsonFormString)).subscribe(query => {
        //console.log("Advanced search query: " + JSON.stringify(query));
        this.$currentQuery.next(query);
      });
    }
    else if(lastQuery){
      this.$currentQuery.next(JSON.parse(lastQuery) as object);
    }
  }
}
