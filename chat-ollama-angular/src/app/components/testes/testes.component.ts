import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UploadFilesRagComponent } from '../auxiliar/upload-files-rag/upload-files-rag.component';


@Component({
  selector: 'app-testes',
  imports: [CommonModule, UploadFilesRagComponent],
  templateUrl: './testes.component.html',
  styleUrl: './testes.component.scss'
})
export class TestesComponent {

  constructor() {

  }

  //#region old
  //@ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;
  //#endregion

}