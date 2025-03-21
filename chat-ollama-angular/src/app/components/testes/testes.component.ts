import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Component } from '@angular/core';
import { OllamaChatService } from '../../services/ollama-chat.service';


@Component({
  selector: 'app-testes',
  imports: [CommonModule],
  templateUrl: './testes.component.html',
  styleUrl: './testes.component.scss'
})
export class TestesComponent {

  files: File[] = [];
  isDragging = false;
  uploadProgress = 0;

  constructor(private ollamaChatService: OllamaChatService, private http: HttpClient) {

  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      this.addFiles(Array.from(droppedFiles));
    }
  }

  onFileSelect(event: any): void {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      this.addFiles(Array.from(selectedFiles));
      // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
      event.target.value = '';
    }
  }

  addFiles(newFiles: File[]): void {
    const filesToAdd: File[] = [];
    for (const newFile of newFiles) {
      const isDuplicate = this.files.some(existingFile => existingFile.name === newFile.name);
      if (!isDuplicate) {
        filesToAdd.push(newFile);
      } else {
        console.warn(`Arquivo duplicado não adicionado: ${newFile.name}`);
      }
    }
    this.files = this.files.concat(filesToAdd);
  }

  onUpload(): void {
    if (this.files.length > 0) {
      const formData = new FormData();
      for (const file of this.files) {
        formData.append('files', file); // 'files' deve corresponder à chave esperada no Flask (request.files.getlist('files'))
      }

      this.uploadProgress = 0;

      this.http.post<any>('http://127.0.0.1:5000/upload', formData, {
        reportProgress: true,
        observe: 'events'
      })
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              if (event.total) {
                this.uploadProgress = Math.round((100 * event.loaded) / event.total);
                console.log(`Progresso do Upload: ${this.uploadProgress}%`);
              }
            } else if (event.type === HttpEventType.Response) {
              console.log('Upload Completo!', event.body);
              this.files = [];
              this.uploadProgress = 0;
            }
          },
          error: (err) => {
            console.error('Erro no Upload:', err);
            this.uploadProgress = 0;
          },
          complete: () => { }
        });
    } else {
      console.log("Nenhum arquivo selecionado para enviar.");
    }
  }

  onClearFiles(): void {
    this.files = [];
  }

  //#region old
  //@ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;
  //#endregion

}