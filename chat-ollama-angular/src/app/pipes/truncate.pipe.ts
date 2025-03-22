import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {

  transform(value: string, limit: number = 10, completeWords: boolean = false, ellipsis: string = '...'): string {
    if (!value) {
      return '';
    }

    if (value.length <= limit) {
      return value;
    }

    let truncatedString = value.substring(0, limit);

    if (completeWords) {
      const lastSpaceIndex = truncatedString.lastIndexOf(' ');
      if (lastSpaceIndex > 0) {
        truncatedString = truncatedString.substring(0, lastSpaceIndex);
      }
    }

    return truncatedString + ellipsis;
  }

}