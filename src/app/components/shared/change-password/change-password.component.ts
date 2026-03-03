import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Principal } from "../../../services/aa.service";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { UsersService } from "../../../services/pubman-rest-client/users.service";
import { catchError, EMPTY, Observable, tap } from "rxjs";
import { PubManHttpErrorResponse } from "../../../services/interceptors/http-error.interceptor";
import { ValidationErrorComponent } from "../validation-error/validation-error.component";
import { STRONG_PASSWORD_REGEX_PATTERN } from "../../../services/form-builder.service";
import { TranslatePipe } from "@ngx-translate/core";
import { BootstrapValidationDirective } from "../../../directives/bootstrap-validation.directive";
import { NotificationComponent } from "../notification/notification.component";
import { Message, MessageService } from "../../../services/message.service";


@Component({
  selector: 'pure-change-password',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ValidationErrorComponent,
    TranslatePipe,
    BootstrapValidationDirective,
    NotificationComponent
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {

  changePasswordForm!: FormGroup;
  passwordChangeSuccess = false;
  passwordChangeLoading = false;
  errorMessage?: Message;

  //Set principal if user is logged in
  @Input() principal : Principal | undefined;
  @Input() username: string | undefined;
  @Input() oneTimePassword: string | undefined;

  @Output() passwordChanged = new EventEmitter();


  constructor(protected activeModal: NgbActiveModal, private formBuilder: FormBuilder, private usersService: UsersService, private messageService: MessageService) {


    this.changePasswordForm = this.formBuilder.group({
      //oldPassword: ['', Validators.required],
      newPassword1: formBuilder.control('',
        {validators : [Validators.required, Validators.pattern(STRONG_PASSWORD_REGEX_PATTERN)]}
      ),
      newPassword2: formBuilder.control('',
        {validators : [Validators.required, Validators.pattern(STRONG_PASSWORD_REGEX_PATTERN)]}
      )
    });


  }


  changePassword() {
    this.passwordChangeLoading = true;
    this.errorMessage = undefined;
    this.passwordChangeSuccess = false;

    const newPassword1 = this.changePasswordForm.get("newPassword1")?.value;
    const newPassword2 = this.changePasswordForm.get("newPassword2")?.value;

    if(newPassword1 !== newPassword2) {
      this.errorMessage = {type: "danger", text: "Passwords do not match"};
      this.passwordChangeLoading = false;
      return;
    }

    let passWordChange$: Observable<any> = EMPTY;

    const newPasswd = this.changePasswordForm.get('newPassword1')?.value;
    if(this.principal) {
      passWordChange$ = this.usersService.changePassword(this.principal?.user?.objectId!, newPasswd, true, {globalErrorDisplay: false});
    }
    else if(this.username && this.oneTimePassword) {
      passWordChange$ = this.usersService.changePasswordOneTime(this.username, this.oneTimePassword, newPasswd, {globalErrorDisplay: false});
    }

    passWordChange$
      .pipe(
        tap((result) => {
          this.passwordChangeLoading = false;
          this.passwordChangeSuccess = true;
          this.changePasswordForm.reset();
          this.passwordChanged.emit(newPasswd)
        }),
        catchError((error: PubManHttpErrorResponse) => {
          this.errorMessage = this.messageService.httpErrorToMessage(error);
          return EMPTY;
        })

      )
      .subscribe()
  }


}
